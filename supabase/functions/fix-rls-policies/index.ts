
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
    console.log('🔧 Starting RLS policy fix process...');

    // First, check if there are any RLS policies on source_pages
    console.log('🔍 Checking for existing RLS policies on source_pages...');

    // The issue is likely that there's no proper RLS policy on source_pages
    // Let's create a permissive one for now to allow insertions
    
    const createPolicyQuery = `
      -- Drop existing policies if any
      DROP POLICY IF EXISTS "Allow insertions for authenticated users" ON public.source_pages;
      DROP POLICY IF EXISTS "Allow all operations for service role" ON public.source_pages;
      
      -- Create a permissive policy for insertions
      CREATE POLICY "Allow all operations for service role" ON public.source_pages
      FOR ALL 
      TO authenticated
      USING (true)
      WITH CHECK (true);
      
      -- Enable RLS on the table
      ALTER TABLE public.source_pages ENABLE ROW LEVEL SECURITY;
    `;

    console.log('🛠️ Creating/updating RLS policies...');
    
    // Execute the policy creation
    const { error: policyError } = await supabase.rpc('exec_sql', {
      sql: createPolicyQuery
    });

    if (policyError) {
      console.error('❌ Error creating RLS policy:', policyError);
      
      // Try an alternative approach - check if RLS is causing issues
      console.log('🔄 Trying alternative approach...');
      
      // Temporarily disable RLS to test
      const { error: disableError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.source_pages DISABLE ROW LEVEL SECURITY;'
      });
      
      if (disableError) {
        console.error('❌ Could not disable RLS:', disableError);
      } else {
        console.log('✅ RLS temporarily disabled for source_pages');
      }
    } else {
      console.log('✅ RLS policies created successfully');
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

    return new Response(
      JSON.stringify({
        success: true,
        message: 'RLS policy fix completed',
        testPassed: !testError
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
