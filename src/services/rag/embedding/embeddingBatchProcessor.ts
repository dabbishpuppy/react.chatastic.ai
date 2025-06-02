
import { supabase } from "@/integrations/supabase/client";
import { MultiLLMEmbeddingRouter } from "./multiLLMEmbeddingRouter";

export interface BatchJob {
  id: string;
  agentId: string;
  chunkIds: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  totalChunks: number;
  processedChunks: number;
  failedChunks: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  estimatedCost: number;
  actualCost: number;
}

export class EmbeddingBatchProcessor {
  // Create a batch embedding job
  static async createBatchJob(
    agentId: string,
    chunkIds: string[],
    provider?: string
  ): Promise<BatchJob> {
    console.log(`📦 Creating batch embedding job for ${chunkIds.length} chunks`);

    // Get chunks to estimate cost
    const { data: chunks, error: chunksError } = await supabase
      .from('source_chunks')
      .select('content')
      .in('id', chunkIds);

    if (chunksError) {
      throw new Error(`Failed to get chunks: ${chunksError.message}`);
    }

    const texts = chunks?.map(chunk => chunk.content) || [];
    const costEstimate = MultiLLMEmbeddingRouter.estimateCost(texts, provider);

    const batchJob: BatchJob = {
      id: crypto.randomUUID(),
      agentId,
      chunkIds,
      status: 'pending',
      progress: 0,
      totalChunks: chunkIds.length,
      processedChunks: 0,
      failedChunks: 0,
      estimatedCost: costEstimate.estimatedCost,
      actualCost: 0
    };

    // Store job metadata in agent_training_jobs table
    const { error: jobError } = await supabase
      .from('agent_training_jobs')
      .insert({
        id: batchJob.id,
        agent_id: agentId,
        status: 'pending',
        total_chunks: chunkIds.length,
        processed_chunks: 0,
        metadata: {
          type: 'embedding_batch',
          chunk_ids: chunkIds,
          estimated_cost: costEstimate.estimatedCost,
          provider: provider || 'openai-small'
        }
      });

    if (jobError) {
      throw new Error(`Failed to create batch job: ${jobError.message}`);
    }

    console.log(`✅ Created batch job: ${batchJob.id}`);
    return batchJob;
  }

  // Process batch embedding job
  static async processBatchJob(
    jobId: string,
    batchSize: number = 50
  ): Promise<BatchJob> {
    console.log(`🔄 Processing batch job: ${jobId}`);

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('agent_training_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Batch job not found: ${jobId}`);
    }

    if (job.status !== 'pending') {
      throw new Error(`Job ${jobId} is not in pending status: ${job.status}`);
    }

    // Update job status to in_progress
    await supabase
      .from('agent_training_jobs')
      .update({ 
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId);

    try {
      const chunkIds = job.metadata?.chunk_ids || [];
      const provider = job.metadata?.provider || 'openai-small';
      
      let processedChunks = 0;
      let failedChunks = 0;
      let totalCost = 0;

      // Process chunks in batches
      for (let i = 0; i < chunkIds.length; i += batchSize) {
        const batchChunkIds = chunkIds.slice(i, i + batchSize);
        
        try {
          // Get chunk contents
          const { data: chunks, error: chunksError } = await supabase
            .from('source_chunks')
            .select('id, content')
            .in('id', batchChunkIds);

          if (chunksError) {
            console.error('Failed to get chunks:', chunksError);
            failedChunks += batchChunkIds.length;
            continue;
          }

          const texts = chunks?.map(chunk => chunk.content) || [];
          const chunkMap = new Map(chunks?.map(chunk => [chunk.content, chunk.id]) || []);

          // Generate embeddings
          const embeddingResponse = await MultiLLMEmbeddingRouter.generateEmbeddings({
            texts,
            provider: provider.split('-')[0] as any,
            agentId: job.agent_id
          });

          totalCost += embeddingResponse.cost;

          // Store embeddings
          const embeddingsToInsert = embeddingResponse.embeddings.map((embedding, index) => {
            const content = texts[index];
            const chunkId = chunkMap.get(content);
            
            return {
              chunk_id: chunkId,
              embedding: JSON.stringify(embedding),
              model_name: embeddingResponse.model
            };
          }).filter(item => item.chunk_id);

          const { error: embeddingError } = await supabase
            .from('source_embeddings')
            .upsert(embeddingsToInsert, { onConflict: 'chunk_id' });

          if (embeddingError) {
            console.error('Failed to store embeddings:', embeddingError);
            failedChunks += batchChunkIds.length;
          } else {
            processedChunks += batchChunkIds.length;
          }

        } catch (error) {
          console.error(`Batch processing error:`, error);
          failedChunks += batchChunkIds.length;
        }

        // Update progress
        const progress = Math.round(((i + batchSize) / chunkIds.length) * 100);
        await supabase
          .from('agent_training_jobs')
          .update({ 
            processed_chunks: processedChunks,
            metadata: supabase.raw(`
              metadata || jsonb_build_object(
                'failed_chunks', $1,
                'actual_cost', $2,
                'progress', $3
              )
            `, [failedChunks, totalCost, progress])
          })
          .eq('id', jobId);

        console.log(`Progress: ${progress}% (${processedChunks}/${chunkIds.length})`);
      }

      // Mark job as completed
      const finalStatus = failedChunks > 0 && processedChunks === 0 ? 'failed' : 'completed';
      
      await supabase
        .from('agent_training_jobs')
        .update({
          status: finalStatus,
          processed_chunks: processedChunks,
          completed_at: new Date().toISOString(),
          metadata: supabase.raw(`
            metadata || jsonb_build_object(
              'failed_chunks', $1,
              'actual_cost', $2,
              'progress', 100
            )
          `, [failedChunks, totalCost])
        })
        .eq('id', jobId);

      console.log(`✅ Batch job completed: ${processedChunks}/${chunkIds.length} chunks processed`);

      return {
        id: jobId,
        agentId: job.agent_id,
        chunkIds,
        status: finalStatus,
        progress: 100,
        totalChunks: chunkIds.length,
        processedChunks,
        failedChunks,
        startedAt: job.started_at,
        completedAt: new Date().toISOString(),
        estimatedCost: job.metadata?.estimated_cost || 0,
        actualCost: totalCost
      };

    } catch (error: any) {
      // Mark job as failed
      await supabase
        .from('agent_training_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      throw error;
    }
  }

  // Get batch job status
  static async getBatchJobStatus(jobId: string): Promise<BatchJob | null> {
    const { data: job, error } = await supabase
      .from('agent_training_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) return null;

    const metadata = job.metadata || {};

    return {
      id: jobId,
      agentId: job.agent_id,
      chunkIds: metadata.chunk_ids || [],
      status: job.status,
      progress: metadata.progress || 0,
      totalChunks: job.total_chunks || 0,
      processedChunks: job.processed_chunks || 0,
      failedChunks: metadata.failed_chunks || 0,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      errorMessage: job.error_message,
      estimatedCost: metadata.estimated_cost || 0,
      actualCost: metadata.actual_cost || 0
    };
  }

  // Get all batch jobs for an agent
  static async getAgentBatchJobs(agentId: string): Promise<BatchJob[]> {
    const { data: jobs, error } = await supabase
      .from('agent_training_jobs')
      .select('*')
      .eq('agent_id', agentId)
      .eq('metadata->>type', 'embedding_batch')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get batch jobs:', error);
      return [];
    }

    return (jobs || []).map(job => {
      const metadata = job.metadata || {};
      return {
        id: job.id,
        agentId: job.agent_id,
        chunkIds: metadata.chunk_ids || [],
        status: job.status,
        progress: metadata.progress || 0,
        totalChunks: job.total_chunks || 0,
        processedChunks: job.processed_chunks || 0,
        failedChunks: metadata.failed_chunks || 0,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        errorMessage: job.error_message,
        estimatedCost: metadata.estimated_cost || 0,
        actualCost: metadata.actual_cost || 0
      };
    });
  }

  // Cancel a batch job
  static async cancelBatchJob(jobId: string): Promise<void> {
    console.log(`❌ Cancelling batch job: ${jobId}`);

    const { error } = await supabase
      .from('agent_training_jobs')
      .update({
        status: 'failed',
        error_message: 'Cancelled by user',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .in('status', ['pending', 'in_progress']);

    if (error) {
      throw new Error(`Failed to cancel job: ${error.message}`);
    }
  }

  // Retry failed chunks in a batch job
  static async retryFailedChunks(jobId: string): Promise<BatchJob> {
    console.log(`🔄 Retrying failed chunks for job: ${jobId}`);

    const currentJob = await this.getBatchJobStatus(jobId);
    if (!currentJob || currentJob.failedChunks === 0) {
      throw new Error('No failed chunks to retry');
    }

    // Create a new job for failed chunks
    // This would require tracking which specific chunks failed
    // For now, we'll reprocess the entire job
    return this.processBatchJob(jobId);
  }
}
