
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

    console.log(`🚀 Starting simplified training for agent: ${agentId}`);

    // Find all sources that need training (requires_manual_training = true OR metadata.training_status = 'in_progress')
    const { data: sourcesToTrain, error: sourcesError } = await supabase
      .from('agent_sources')
      .select('id, title, source_type, content, crawl_status, requires_manual_training, metadata, parent_source_id')
      .eq('agent_id', agentId)
      .eq('is_active', true)
      .or('requires_manual_training.eq.true,metadata->>training_status.eq.in_progress');

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
    const parentSourcesToUpdate = new Set<string>();

    // Process each source
    for (const source of sourcesToTrain) {
      try {
        console.log(`🔄 Training source: ${source.title} (${source.id})`);

        const isParentSource = !source.parent_source_id;
        
        // Mark source as training
        if (isParentSource) {
          // For parent sources, set training status
          await supabase
            .from('agent_sources')
            .update({ 
              crawl_status: 'training',
              requires_manual_training: false,
              metadata: {
                ...((source.metadata as any) || {}),
                training_started_at: new Date().toISOString(),
                training_status: 'in_progress',
                training_method: 'simplified_flow'
              }
            })
            .eq('id', source.id);
        } else {
          // For child sources, mark as in progress
          await supabase
            .from('agent_sources')
            .update({ 
              requires_manual_training: false,
              metadata: {
                ...((source.metadata as any) || {}),
                training_started_at: new Date().toISOString(),
                training_status: 'in_progress',
                training_method: 'simplified_flow'
              }
            })
            .eq('id', source.id);
        }

        // Generate chunks based on source type
        if (source.source_type === 'website') {
          // For website sources, process crawled pages and update their status
          console.log(`📄 Processing website source pages for: ${source.id}`);
          
          // Update all source_pages for this parent to "in_progress"
          await supabase
            .from('source_pages')
            .update({ 
              processing_status: 'in_progress'
            })
            .eq('parent_source_id', source.id)
            .eq('status', 'completed');

          const processingResult = await supabase.functions.invoke('process-crawled-pages', {
            body: { parentSourceId: source.id }
          });

          if (processingResult.error) {
            throw new Error(`Failed to process crawled pages: ${processingResult.error.message}`);
          }

          // Mark all processed pages as "trained"
          await supabase
            .from('source_pages')
            .update({ 
              processing_status: 'completed'
            })
            .eq('parent_source_id', source.id)
            .eq('processing_status', 'in_progress');

        } else {
          // For other source types, generate chunks directly
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

          console.log(`📄 Generated chunks for source: ${source.id}`);

          // Generate embeddings
          const embeddingResult = await supabase.functions.invoke('generate-embeddings', {
            body: { sourceId: source.id }
          });

          if (embeddingResult.error) {
            throw new Error(`Embedding generation failed: ${embeddingResult.error.message}`);
          }

          console.log(`🤖 Generated embeddings for source: ${source.id}`);
        }

        // Mark source as training completed
        if (isParentSource) {
          // Mark parent as training completed
          await supabase
            .from('agent_sources')
            .update({ 
              crawl_status: 'completed',
              requires_manual_training: false,
              metadata: {
                ...((source.metadata as any) || {}),
                training_completed_at: new Date().toISOString(),
                training_status: 'completed',
                training_method: 'simplified_flow',
                last_trained_at: new Date().toISOString()
              }
            })
            .eq('id', source.id);

          console.log(`✅ Parent source ${source.id} marked as training completed`);
          
          // Add to set for status aggregation
          parentSourcesToUpdate.add(source.id);
        } else {
          // Mark child source as trained
          await supabase
            .from('agent_sources')
            .update({ 
              requires_manual_training: false,
              metadata: {
                ...((source.metadata as any) || {}),
                training_completed_at: new Date().toISOString(),
                training_status: 'completed',
                training_method: 'simplified_flow',
                last_trained_at: new Date().toISOString()
              }
            })
            .eq('id', source.id);

          console.log(`✅ Child source ${source.id} marked as trained`);
        }

        processedCount++;
        console.log(`✅ Successfully processed source: ${source.title}`);

        // If this is a child source, check if all siblings are trained and update parent
        if (source.parent_source_id) {
          await checkAndUpdateParentStatus(supabase, source.parent_source_id);
          // Add parent to set for status aggregation
          parentSourcesToUpdate.add(source.parent_source_id);
        }

      } catch (error) {
        console.error(`❌ Error training source ${source.id}:`, error);
        
        // Mark as failed
        await supabase
          .from('agent_sources')
          .update({ 
            crawl_status: source.source_type === 'website' ? 'ready_for_training' : undefined,
            requires_manual_training: true,
            metadata: {
              ...((source.metadata as any) || {}),
              training_error: error.message,
              training_failed_at: new Date().toISOString(),
              training_status: 'failed'
            }
          })
          .eq('id', source.id);
        
        errors.push(`Source ${source.title}: ${error.message}`);
      }
    }

    // After all training is complete, trigger status aggregation for all parent sources
    console.log(`🔄 Triggering status aggregation for ${parentSourcesToUpdate.size} parent sources`);
    for (const parentSourceId of parentSourcesToUpdate) {
      try {
        const aggregationResult = await supabase.functions.invoke('status-aggregator', {
          body: { 
            parentSourceId: parentSourceId,
            eventType: 'training_completed'
          }
        });

        if (aggregationResult.error) {
          console.error(`❌ Failed to aggregate status for parent ${parentSourceId}:`, aggregationResult.error);
        } else {
          console.log(`✅ Status aggregated for parent: ${parentSourceId}`);
        }
      } catch (error) {
        console.error(`❌ Error aggregating status for parent ${parentSourceId}:`, error);
      }
    }

    console.log(`✅ Simplified training completed: ${processedCount} sources processed`);

    const result = {
      success: true,
      processedSources: processedCount,
      totalSources: sourcesToTrain.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully trained ${processedCount} sources`,
      parentSourcesUpdated: parentSourcesToUpdate.size
    };

    if (errors.length > 0) {
      console.warn(`⚠️ Training completed with ${errors.length} errors:`, errors);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Simplified training error:', error);
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

// Helper function to check and update parent status
async function checkAndUpdateParentStatus(supabase: any, parentSourceId: string) {
  try {
    // Get all child sources for this parent
    const { data: childSources, error } = await supabase
      .from('agent_sources')
      .select('id, metadata, requires_manual_training')
      .eq('parent_source_id', parentSourceId)
      .eq('is_active', true);

    if (error || !childSources) {
      console.error('Error fetching child sources:', error);
      return;
    }

    // Check if all children are trained
    const allChildrenTrained = childSources.every(child => {
      const metadata = (child.metadata as any) || {};
      return metadata.training_completed_at || metadata.last_trained_at || !child.requires_manual_training;
    });

    if (allChildrenTrained) {
      // Update parent source status to training completed
      await supabase
        .from('agent_sources')
        .update({
          crawl_status: 'completed',
          requires_manual_training: false,
          metadata: {
            training_completed_at: new Date().toISOString(),
            training_status: 'completed',
            last_trained_at: new Date().toISOString(),
            children_training_completed: true
          }
        })
        .eq('id', parentSourceId);

      console.log(`✅ Updated parent source ${parentSourceId} - all children trained`);
    }
  } catch (error) {
    console.error('Error updating parent status:', error);
  }
}
