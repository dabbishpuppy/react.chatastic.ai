
import { BackgroundJobProcessor } from './BackgroundJobProcessor';
import { BackgroundJob } from '../types';
import { WorkflowEngine } from '../WorkflowEngine';
import { supabase } from '@/integrations/supabase/client';

/**
 * Processor for training jobs
 */
export class TrainingJobProcessor extends BackgroundJobProcessor {
  protected jobType = 'train_pages';

  protected async processJob(job: BackgroundJob): Promise<void> {
    console.log(`🎓 Processing training job: ${job.id} for source: ${job.source_id}`);

    try {
      // Transition source to TRAINING if not already
      await WorkflowEngine.transitionSourceStatus(
        job.source_id,
        'TRAINING',
        'TRAINING_PROCESSING',
        {
          job_id: job.id,
          started_at: new Date().toISOString()
        }
      );

      // Check if source has completed pages to train
      const { data: pages, error: pagesError } = await supabase
        .from('source_pages')
        .select('id, status')
        .eq('parent_source_id', job.source_id)
        .eq('status', 'completed');

      if (pagesError) {
        throw new Error(`Error fetching pages: ${pagesError.message}`);
      }

      if (!pages || pages.length === 0) {
        throw new Error('No completed pages found for training');
      }

      // Process chunks for all completed pages
      const { data: result, error: processingError } = await supabase.functions.invoke('process-crawled-pages', {
        body: {
          parentSourceId: job.source_id
        }
      });

      if (processingError) {
        throw new Error(`Training function error: ${processingError.message}`);
      }

      if (!result || !result.success) {
        throw new Error(result?.error || 'Training processing failed');
      }

      // Generate embeddings if chunks were created
      if (result.totalChunks > 0) {
        const { error: embeddingError } = await supabase.functions.invoke('generate-embeddings', {
          body: {
            sourceId: job.source_id
          }
        });

        if (embeddingError) {
          console.warn(`⚠️ Embedding generation failed: ${embeddingError.message}`);
          // Don't fail the entire job for embedding errors
        }
      }

      // Transition to TRAINED status
      await WorkflowEngine.transitionSourceStatus(
        job.source_id,
        'TRAINED',
        'TRAINING_COMPLETED',
        {
          job_id: job.id,
          completed_at: new Date().toISOString(),
          training_result: result,
          chunks_created: result.totalChunks,
          pages_processed: result.processedPages
        }
      );

      console.log(`✅ Training job completed: ${job.id} - ${result.processedPages} pages, ${result.totalChunks} chunks`);

    } catch (error) {
      console.error(`❌ Training job failed: ${job.id}`, error);
      
      // Transition to ERROR status
      await WorkflowEngine.transitionSourceStatus(
        job.source_id,
        'ERROR',
        'TRAINING_FAILED',
        {
          job_id: job.id,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          failed_at: new Date().toISOString()
        }
      );

      throw error;
    }
  }
}
