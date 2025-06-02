
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔄 Starting source pages processing batch...');

    // Get pending source pages to process
    const { data: pendingPages, error: fetchError } = await supabaseClient
      .from('source_pages')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10); // Process in small batches

    if (fetchError) {
      throw new Error(`Failed to fetch pending pages: ${fetchError.message}`);
    }

    if (!pendingPages || pendingPages.length === 0) {
      console.log('📭 No pending source pages to process');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending pages to process',
          processedCount: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`📋 Found ${pendingPages.length} pending pages to process`);

    // Process each page by calling the child-job-processor
    const results = [];
    
    for (const page of pendingPages) {
      try {
        console.log(`🚀 Processing page: ${page.url}`);
        
        // Call the child-job-processor function
        const { data: processingResult, error: processingError } = await supabaseClient
          .functions.invoke('child-job-processor', {
            body: { childJobId: page.id }
          });

        if (processingError) {
          console.error(`❌ Failed to process page ${page.id}:`, processingError);
          results.push({
            pageId: page.id,
            url: page.url,
            success: false,
            error: processingError.message
          });
        } else {
          console.log(`✅ Successfully processed page ${page.id}`);
          results.push({
            pageId: page.id,
            url: page.url,
            success: true,
            result: processingResult
          });
        }
      } catch (error) {
        console.error(`❌ Error processing page ${page.id}:`, error);
        results.push({
          pageId: page.id,
          url: page.url,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`📊 Batch processing complete: ${successCount} successful, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        processedCount: pendingPages.length,
        successCount,
        failedCount,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Source pages processor error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
