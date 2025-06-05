
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

    console.log(`🚀 Starting enhanced training for agent: ${agentId}`);

    // Find all sources that need training (status = 'crawled' or requires_manual_training = true)
    const { data: sourcesToTrain, error: sourcesError } = await supabase
      .from('agent_sources')
      .select('id, title, source_type, content, crawl_status, requires_manual_training, metadata')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .or('crawl_status.eq.completed,requires_manual_training.eq.true');

    if (sourcesError) {
      throw new Error(`Failed to fetch sources: ${sourcesError.message}`);
    }

    if (!sourcesToTrain || sourcesToTrain.length === 0) {
      console.log('No sources requiring training found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No sources requiring training',
          processedSources: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${sourcesToTrain.length} sources to train`);

    let processedCount = 0;
    let errors = [];

    // Process each source
    for (const source of sourcesToTrain) {
      try {
        console.log(`🔄 Training source: ${source.title} (${source.id})`);

        // Mark source as training and update child pages if needed
        await supabase
          .from('agent_sources')
          .update({ 
            crawl_status: source.source_type === 'website' ? 'training' : undefined,
            requires_manual_training: false,
            metadata: {
              ...source.metadata,
              training_started_at: new Date().toISOString(),
              training_method: 'enhanced_flow'
            }
          })
          .eq('id', source.id);

        // For website sources, mark all child pages as training and process them
        if (source.source_type === 'website') {
          // Update child pages to training status
          await supabase
            .from('source_pages')
            .update({ 
              processing_status: 'training',
              metadata: {
                training_started_at: new Date().toISOString()
              }
            })
            .eq('parent_source_id', source.id)
            .eq('status', 'completed');

          // Process crawled pages - this should create chunks
          const processingResult = await supabase.functions.invoke('process-crawled-pages', {
            body: { parentSourceId: source.id }
          });

          if (processingResult.error) {
            console.error(`Failed to process crawled pages: ${processingResult.error.message}`);
            // Continue processing but mark as error
            throw new Error(`Failed to process crawled pages: ${processingResult.error.message}`);
          }

          console.log(`✅ Processed crawled pages for ${source.title}:`, processingResult.data);

          // Mark child pages as trained after processing
          await supabase
            .from('source_pages')
            .update({ 
              processing_status: 'trained',
              metadata: {
                training_completed_at: new Date().toISOString(),
                chunks_processed: processingResult.data?.chunksCreated || 0
              }
            })
            .eq('parent_source_id', source.id)
            .eq('processing_status', 'training');

        } else {
          // For other source types, generate chunks directly
          console.log(`🔧 Generating chunks for ${source.source_type} source: ${source.title}`);
          
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

          console.log(`✅ Generated ${chunkResult.data?.chunksCreated || 0} chunks for ${source.title}`);

          // Generate embeddings for the chunks
          const embeddingResult = await supabase.functions.invoke('generate-embeddings', {
            body: { sourceId: source.id }
          });

          if (embeddingResult.error) {
            console.error(`Embedding generation failed: ${embeddingResult.error.message}`);
            // Continue even if embeddings fail
          } else {
            console.log(`✅ Generated embeddings for ${source.title}:`, embeddingResult.data);
          }
        }

        // Mark source as completed
        await supabase
          .from('agent_sources')
          .update({ 
            crawl_status: source.source_type === 'website' ? 'completed' : undefined,
            requires_manual_training: false,
            metadata: {
              ...source.metadata,
              training_completed_at: new Date().toISOString(),
              training_method: 'enhanced_flow',
              training_status: 'completed'
            }
          })
          .eq('id', source.id);

        processedCount++;
        console.log(`✅ Successfully trained source: ${source.title}`);

      } catch (error) {
        console.error(`❌ Error training source ${source.id}:`, error);
        
        // Mark as failed and revert child pages if needed
        await supabase
          .from('agent_sources')
          .update({ 
            crawl_status: source.source_type === 'website' ? 'completed' : undefined,
            requires_manual_training: true,
            metadata: {
              ...source.metadata,
              training_error: error.message,
              training_failed_at: new Date().toISOString()
            }
          })
          .eq('id', source.id);

        if (source.source_type === 'website') {
          await supabase
            .from('source_pages')
            .update({ 
              processing_status: 'completed',
              metadata: {
                training_error: error.message,
                training_failed_at: new Date().toISOString()
              }
            })
            .eq('parent_source_id', source.id)
            .eq('processing_status', 'training');
        }
        
        errors.push(`Source ${source.title}: ${error.message}`);
      }
    }

    console.log(`✅ Enhanced training completed: ${processedCount} sources processed`);

    const result = {
      success: true,
      processedSources: processedCount,
      totalSources: sourcesToTrain.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully trained ${processedCount} sources`
    };

    if (errors.length > 0) {
      console.warn(`⚠️ Training completed with ${errors.length} errors:`, errors);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Enhanced training error:', error);
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
