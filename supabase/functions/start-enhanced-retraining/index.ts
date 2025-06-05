
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
    const { agentId } = await req.json();

    if (!agentId) {
      throw new Error('agentId is required');
    }

    console.log(`🚀 Starting enhanced retraining for agent: ${agentId}`);

    // Find all website sources that have completed crawling but need processing
    const { data: websiteSources, error: sourcesError } = await supabase
      .from('agent_sources')
      .select('id, title, url, crawl_status')
      .eq('agent_id', agentId)
      .eq('source_type', 'website')
      .eq('crawl_status', 'completed')
      .eq('requires_manual_training', true)
      .eq('is_active', true);

    if (sourcesError) {
      throw new Error(`Failed to fetch website sources: ${sourcesError.message}`);
    }

    if (!websiteSources || websiteSources.length === 0) {
      console.log('No website sources requiring training found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No sources requiring training',
          processedSources: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${websiteSources.length} website sources to process`);

    let processedCount = 0;
    let errors = [];

    // Process each website source
    for (const source of websiteSources) {
      try {
        console.log(`🔄 Processing website source: ${source.title} (${source.id})`);

        // Mark source as training started
        await supabase
          .from('agent_sources')
          .update({ 
            requires_manual_training: false,
            metadata: {
              training_started_at: new Date().toISOString(),
              training_method: 'enhanced_retraining'
            }
          })
          .eq('id', source.id);

        // Call process-crawled-pages to handle chunk creation
        const processingResult = await supabase.functions.invoke('process-crawled-pages', {
          body: { parentSourceId: source.id }
        });

        if (processingResult.error) {
          console.error(`❌ Failed to process source ${source.id}:`, processingResult.error);
          
          // Mark as failed
          await supabase
            .from('agent_sources')
            .update({ 
              requires_manual_training: true,
              metadata: {
                training_error: processingResult.error.message,
                training_failed_at: new Date().toISOString()
              }
            })
            .eq('id', source.id);
          
          errors.push(`Source ${source.title}: ${processingResult.error.message}`);
          continue;
        }

        processedCount++;
        console.log(`✅ Successfully processed source: ${source.title}`);

      } catch (error) {
        console.error(`❌ Error processing source ${source.id}:`, error);
        
        // Mark as failed
        await supabase
          .from('agent_sources')
          .update({ 
            requires_manual_training: true,
            metadata: {
              training_error: error.message,
              training_failed_at: new Date().toISOString()
            }
          })
          .eq('id', source.id);
        
        errors.push(`Source ${source.title}: ${error.message}`);
      }
    }

    // Also process other source types (text, file, qa)
    const { data: otherSources, error: otherSourcesError } = await supabase
      .from('agent_sources')
      .select('id, title, content, source_type, metadata')
      .eq('agent_id', agentId)
      .in('source_type', ['text', 'file', 'qa'])
      .eq('requires_manual_training', true)
      .eq('is_active', true);

    if (otherSourcesError) {
      console.warn('Failed to fetch other source types:', otherSourcesError);
    } else if (otherSources && otherSources.length > 0) {
      console.log(`📄 Processing ${otherSources.length} other sources`);
      
      for (const source of otherSources) {
        try {
          // Mark as processing
          await supabase
            .from('agent_sources')
            .update({ 
              requires_manual_training: false,
              metadata: {
                training_started_at: new Date().toISOString(),
                training_method: 'enhanced_retraining'
              }
            })
            .eq('id', source.id);

          // Generate chunks
          const chunkResult = await supabase.functions.invoke('generate-chunks', {
            body: { 
              sourceId: source.id,
              content: source.content,
              sourceType: source.source_type 
            }
          });

          if (chunkResult.error) {
            throw new Error(`Chunk generation failed: ${chunkResult.error.message}`);
          }

          // Generate embeddings
          const embeddingResult = await supabase.functions.invoke('generate-embeddings', {
            body: { sourceId: source.id }
          });

          if (embeddingResult.error) {
            throw new Error(`Embedding generation failed: ${embeddingResult.error.message}`);
          }

          processedCount++;
          console.log(`✅ Successfully processed other source: ${source.title}`);

        } catch (error) {
          console.error(`❌ Error processing other source ${source.id}:`, error);
          
          await supabase
            .from('agent_sources')
            .update({ 
              requires_manual_training: true,
              metadata: {
                training_error: error.message,
                training_failed_at: new Date().toISOString()
              }
            })
            .eq('id', source.id);
          
          errors.push(`Source ${source.title}: ${error.message}`);
        }
      }
    }

    console.log(`✅ Enhanced retraining completed: ${processedCount} sources processed`);

    const result = {
      success: true,
      processedSources: processedCount,
      totalSources: (websiteSources?.length || 0) + (otherSources?.length || 0),
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully processed ${processedCount} sources`
    };

    if (errors.length > 0) {
      console.warn(`⚠️ Retraining completed with ${errors.length} errors:`, errors);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Enhanced retraining error:', error);
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
