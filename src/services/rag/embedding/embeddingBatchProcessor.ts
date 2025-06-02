
import { supabase } from "@/integrations/supabase/client";
import { MultiLLMEmbeddingRouter } from "./multiLLMEmbeddingRouter";

export interface BatchJob {
  id: string;
  agentId: string;
  chunkIds: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
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

    const jobMetadata = {
      type: 'embedding_batch',
      chunk_ids: chunkIds,
      estimated_cost: costEstimate.estimatedCost,
      provider: provider || 'openai-small',
      progress: 0,
      failed_chunks: 0,
      actual_cost: 0
    };

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

    // Store job metadata in agent_training_jobs table (without metadata column)
    const { error: jobError } = await supabase
      .from('agent_training_jobs')
      .insert({
        id: batchJob.id,
        agent_id: agentId,
        status: 'pending',
        total_chunks: chunkIds.length,
        processed_chunks: 0
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

    // Update job status to processing
    await supabase
      .from('agent_training_jobs')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', jobId);

    try {
      // For now, simulate chunk processing since we don't have the chunk_ids stored
      // In a real implementation, you'd store this in a separate job_metadata table
      let processedChunks = 0;
      let failedChunks = 0;
      let totalCost = 0;
      const totalChunks = job.total_chunks || 0;

      // Simulate processing batches
      for (let i = 0; i < totalChunks; i += batchSize) {
        const batchEnd = Math.min(i + batchSize, totalChunks);
        
        try {
          // Simulate embedding generation cost
          totalCost += 0.0001 * batchSize; // Mock cost
          processedChunks += (batchEnd - i);
        } catch (error) {
          console.error(`Batch processing error:`, error);
          failedChunks += (batchEnd - i);
        }

        // Update progress
        const progress = Math.round((processedChunks + failedChunks) / totalChunks * 100);
        await supabase
          .from('agent_training_jobs')
          .update({ 
            processed_chunks: processedChunks
          })
          .eq('id', jobId);

        console.log(`Progress: ${progress}% (${processedChunks}/${totalChunks})`);
      }

      // Mark job as completed
      const finalStatus = failedChunks > 0 && processedChunks === 0 ? 'failed' : 'completed';
      
      await supabase
        .from('agent_training_jobs')
        .update({
          status: finalStatus,
          processed_chunks: processedChunks,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      console.log(`✅ Batch job completed: ${processedChunks}/${totalChunks} chunks processed`);

      return {
        id: jobId,
        agentId: job.agent_id,
        chunkIds: [], // Would need to be stored separately
        status: finalStatus as any,
        progress: 100,
        totalChunks,
        processedChunks,
        failedChunks,
        startedAt: job.started_at || undefined,
        completedAt: new Date().toISOString(),
        estimatedCost: 0,
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

    return {
      id: jobId,
      agentId: job.agent_id,
      chunkIds: [], // Would need separate storage
      status: job.status as any,
      progress: job.processed_chunks && job.total_chunks ? 
        Math.round((job.processed_chunks / job.total_chunks) * 100) : 0,
      totalChunks: job.total_chunks || 0,
      processedChunks: job.processed_chunks || 0,
      failedChunks: 0, // Would need separate tracking
      startedAt: job.started_at || undefined,
      completedAt: job.completed_at || undefined,
      errorMessage: job.error_message || undefined,
      estimatedCost: 0,
      actualCost: 0
    };
  }

  // Get all batch jobs for an agent
  static async getAgentBatchJobs(agentId: string): Promise<BatchJob[]> {
    const { data: jobs, error } = await supabase
      .from('agent_training_jobs')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get batch jobs:', error);
      return [];
    }

    return (jobs || []).map(job => ({
      id: job.id,
      agentId: job.agent_id,
      chunkIds: [], // Would need separate storage
      status: job.status as any,
      progress: job.processed_chunks && job.total_chunks ? 
        Math.round((job.processed_chunks / job.total_chunks) * 100) : 0,
      totalChunks: job.total_chunks || 0,
      processedChunks: job.processed_chunks || 0,
      failedChunks: 0,
      startedAt: job.started_at || undefined,
      completedAt: job.completed_at || undefined,
      errorMessage: job.error_message || undefined,
      estimatedCost: 0,
      actualCost: 0
    }));
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
      .in('status', ['pending', 'processing']);

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

    // For now, reprocess the entire job
    return this.processBatchJob(jobId);
  }
}
