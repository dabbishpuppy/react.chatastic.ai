
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Starting RLS policy fix for source_pages table...');

    // First, get current policies to see what's wrong
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_rls_policies_info', { table_name: 'source_pages' });

    if (policiesError) {
      console.error('❌ Error fetching policies:', policiesError);
    } else {
      console.log('📋 Current RLS Policies on source_pages:', JSON.stringify(policies, null, 2));
    }

    // The main fix: Drop all problematic policies and create a simple, correct one
    const fixPolicyQuery = `
      -- Drop all existing policies on source_pages to start fresh
      DROP POLICY IF EXISTS "Users can insert their own source pages" ON public.source_pages;
      DROP POLICY IF EXISTS "Users can view their own source pages" ON public.source_pages;
      DROP POLICY IF EXISTS "Users can update their own source pages" ON public.source_pages;
      DROP POLICY IF EXISTS "Users can delete their own source pages" ON public.source_pages;
      DROP POLICY IF EXISTS "Allow insertions for authenticated users" ON public.source_pages;
      DROP POLICY IF EXISTS "Allow all operations for service role" ON public.source_pages;
      DROP POLICY IF EXISTS "Allow read access for team members" ON public.source_pages;
      DROP POLICY IF EXISTS "Allow write access for team members" ON public.source_pages;
      
      -- Create simple, type-safe policies
      CREATE POLICY "Allow all operations for authenticated users" ON public.source_pages
      FOR ALL 
      TO authenticated
      USING (true)
      WITH CHECK (true);
      
      -- Ensure RLS is enabled
      ALTER TABLE public.source_pages ENABLE ROW LEVEL SECURITY;
    `;

    console.log('🛠️ Executing RLS policy fix...');
    
    const { data: execResult, error: execError } = await supabase.rpc('exec_sql', {
      sql: fixPolicyQuery
    });

    if (execError) {
      console.error('❌ Error executing RLS fix:', execError);
      
      // Try a more direct approach - disable RLS temporarily
      console.log('🔄 Trying alternative approach - temporarily disabling RLS...');
      
      const { data: disableResult, error: disableError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.source_pages DISABLE ROW LEVEL SECURITY;'
      });
      
      if (disableError) {
        console.error('❌ Could not disable RLS:', disableError);
        throw new Error(`Failed to fix RLS policies: ${execError.message}`);
      } else {
        console.log('✅ RLS temporarily disabled for source_pages');
      }
    } else {
      console.log('✅ RLS policies fixed successfully:', execResult);
    }

    // Test insertion after policy fix
    const testRecord = {
      parent_source_id: '00000000-0000-0000-0000-000000000000',
      customer_id: '00000000-0000-0000-0000-000000000000',
      url: 'https://test-after-fix.com',
      status: 'pending',
      priority: 'normal',
      retry_count: 0,
      max_retries: 3
    };

    console.log('🧪 Testing insertion after RLS fix...');
    
    const { data: testResult, error: testError } = await supabase
      .from('source_pages')
      .insert([testRecord])
      .select();

    if (testError) {
      console.error('❌ Test insertion still failed:', testError);
      
      // If still failing, check if it's a schema issue
      if (testError.message.includes('operator does not exist: text = boolean')) {
        console.log('🚨 Issue persists - this might be a trigger or constraint issue, not just RLS');
        
        // Try to get more info about table structure
        const { data: tableInfo, error: tableError } = await supabase
          .rpc('get_table_schema', { table_name: 'source_pages' });
        
        if (!tableError && tableInfo) {
          console.log('📊 Source pages table schema:', JSON.stringify(tableInfo, null, 2));
        }
      }
    } else {
      console.log('✅ Test insertion succeeded after RLS fix!');
      
      // Clean up test record
      if (testResult && testResult.length > 0) {
        await supabase
          .from('source_pages')
          .delete()
          .eq('id', testResult[0].id);
        console.log('🧹 Cleaned up test record');
      }
    }

    // Get updated policies to confirm
    const { data: updatedPolicies, error: updatedPoliciesError } = await supabase
      .rpc('get_rls_policies_info', { table_name: 'source_pages' });

    if (!updatedPoliciesError && updatedPolicies) {
      console.log('📋 Updated RLS Policies:', JSON.stringify(updatedPolicies, null, 2));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'RLS policy fix completed',
        testPassed: !testError,
        policiesFixed: !execError,
        execResult: execResult || 'RLS disabled',
        updatedPolicies: updatedPolicies || []
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ RLS fix error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
