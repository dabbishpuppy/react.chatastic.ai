
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client with service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create the stats function
    const createStatsFn = `
    CREATE OR REPLACE FUNCTION public.get_source_pages_stats(parent_source_id_param UUID)
    RETURNS TABLE(
      total_count BIGINT,
      completed_count BIGINT,
      failed_count BIGINT,
      in_progress_count BIGINT,
      pending_count BIGINT
    )
    LANGUAGE sql
    SECURITY DEFINER
    AS $$
      SELECT 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count
      FROM public.source_pages
      WHERE parent_source_id = parent_source_id_param;
    $$;
    `;

    const { error: fnError } = await supabase.rpc('exec_sql', {
      sql: createStatsFn
    });

    if (fnError) {
      console.error('Error creating stats function:', fnError);
    }

    // Enable RLS on source_pages and add policy
    const rlsPolicy = `
    -- Enable RLS on source_pages
    ALTER TABLE public.source_pages ENABLE ROW LEVEL SECURITY;

    -- Drop any existing policies if needed
    DROP POLICY IF EXISTS "source_pages_team_access" ON public.source_pages;

    -- Create a policy that allows authenticated users to manage their team's pages
    CREATE POLICY "source_pages_team_access" ON public.source_pages
    FOR ALL 
    TO authenticated
    USING (
      customer_id IN (
        SELECT team_id FROM public.team_members 
        WHERE user_id = auth.uid()
      )
    )
    WITH CHECK (
      customer_id IN (
        SELECT team_id FROM public.team_members 
        WHERE user_id = auth.uid()
      )
    );
    `;

    const { error: policyError } = await supabase.rpc('exec_sql', {
      sql: rlsPolicy
    });

    if (policyError) {
      console.error('Error creating RLS policy:', policyError);
    }

    return new Response(
      JSON.stringify({
        success: !fnError && !policyError,
        message: 'Database setup complete',
        fnResult: fnError ? fnError.message : 'Success',
        policyResult: policyError ? policyError.message : 'Success'
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in function:', error);
    
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
