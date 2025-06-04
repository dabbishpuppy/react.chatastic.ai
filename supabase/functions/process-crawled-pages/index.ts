
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { parentSourceId } = await req.json();

    if (!parentSourceId) {
      throw new Error('parentSourceId is required');
    }

    console.log(`🔄 Processing crawled pages for parent source: ${parentSourceId}`);

    // Get all crawled but unprocessed pages
    const { data: pages, error: pagesError } = await supabase
      .from('source_pages')
      .select('*')
      .eq('parent_source_id', parentSourceId)
      .eq('status', 'completed')
      .eq('processing_status', 'pending');

    if (pagesError) {
      throw new Error(`Failed to fetch pages: ${pagesError.message}`);
    }

    if (!pages || pages.length === 0) {
      console.log('No unprocessed pages found');
      return new Response(
        JSON.stringify({
          success: true,
          processedPages: 0,
          message: 'No unprocessed pages found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pages.length} pages to process`);

    let processedCount = 0;
    let totalChunks = 0;

    // Process each page
    for (const page of pages) {
      try {
        console.log(`Processing page: ${page.url}`);

        // Call the child job processor to create chunks and embeddings
        const processingResult = await supabase.functions.invoke('process-page-content', {
          body: { pageId: page.id }
        });

        if (processingResult.error) {
          console.error(`Failed to process page ${page.id}:`, processingResult.error);
          // Mark as failed
          await supabase
            .from('source_pages')
            .update({ 
              processing_status: 'failed',
              metadata: {
                ...page.metadata,
                processing_error: processingResult.error.message,
                processed_at: new Date().toISOString()
              }
            })
            .eq('id', page.id);
          continue;
        }

        // Mark as processed
        await supabase
          .from('source_pages')
          .update({ 
            processing_status: 'processed',
            chunks_created: processingResult.data?.chunksCreated || 0,
            metadata: {
              ...page.metadata,
              processed_at: new Date().toISOString()
            }
          })
          .eq('id', page.id);

        processedCount++;
        totalChunks += processingResult.data?.chunksCreated || 0;
        console.log(`✅ Processed page ${page.id} - created ${processingResult.data?.chunksCreated || 0} chunks`);

      } catch (error) {
        console.error(`Error processing page ${page.id}:`, error);
        // Mark as failed
        await supabase
          .from('source_pages')
          .update({ 
            processing_status: 'failed',
            metadata: {
              ...page.metadata,
              processing_error: error.message,
              processed_at: new Date().toISOString()
            }
          })
          .eq('id', page.id);
      }
    }

    // Update parent source
    await supabase
      .from('agent_sources')
      .update({ 
        requires_manual_training: false,
        metadata: {
          last_training_at: new Date().toISOString(),
          pages_processed: processedCount,
          total_chunks_created: totalChunks
        }
      })
      .eq('id', parentSourceId);

    console.log(`✅ Completed processing ${processedCount}/${pages.length} pages, created ${totalChunks} total chunks`);

    return new Response(
      JSON.stringify({
        success: true,
        processedPages: processedCount,
        totalPages: pages.length,
        totalChunks,
        message: `Successfully processed ${processedCount} pages and created ${totalChunks} chunks`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Processing error:', error);
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
