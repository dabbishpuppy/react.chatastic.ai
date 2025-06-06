
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    console.log('🔍 Starting RLS policy diagnosis...');

    // Query to get all RLS policies on source_pages table
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'source_pages');

    if (policiesError) {
      console.error('❌ Error fetching policies:', policiesError);
    } else {
      console.log('📋 RLS Policies on source_pages:', JSON.stringify(policies, null, 2));
    }

    // Query table schema to understand column types
    const { data: columns, error: columnsError } = await supabase.rpc('get_table_schema', {
      table_name: 'source_pages'
    });

    if (columnsError) {
      console.error('❌ Error fetching schema:', columnsError);
    } else {
      console.log('📊 source_pages schema:', JSON.stringify(columns, null, 2));
    }

    // Try a simple test insert to see the exact error
    const testRecord = {
      parent_source_id: '00000000-0000-0000-0000-000000000000',
      customer_id: '00000000-0000-0000-0000-000000000000',
      url: 'https://test.com',
      status: 'pending',
      priority: 'normal',
      retry_count: 0,
      max_retries: 3
    };

    console.log('🧪 Testing insert with record:', JSON.stringify(testRecord, null, 2));

    const { data: testResult, error: testError } = await supabase
      .from('source_pages')
      .insert([testRecord])
      .select();

    if (testError) {
      console.error('❌ Test insert failed:', {
        code: testError.code,
        message: testError.message,
        details: testError.details,
        hint: testError.hint
      });
    } else {
      console.log('✅ Test insert succeeded:', testResult);
      
      // Clean up test record
      if (testResult && testResult.length > 0) {
        await supabase
          .from('source_pages')
          .delete()
          .eq('id', testResult[0].id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        policies: policies || [],
        columns: columns || [],
        testError: testError || null
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Diagnosis error:', error);
    
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
