
import { TrainingJobService } from '../trainingJobService';
import { AgentSourceService } from '../agentSourceService';
import { SourceChunkService } from '../sourceChunkService';
import { EmbeddingService } from '../embeddingService';
import { RAGPerformanceMonitor } from '../performance/performanceMonitor';
import { AgentTrainingJob, TrainingStatus } from '@/types/rag';

export interface RetrainingConfig {
  agentId: string;
  triggers: {
    newSourcesThreshold: number;
    performanceDropThreshold: number;
    timeBasedInterval?: number; // days
    manualTrigger?: boolean;
  };
  trainingOptions: {
    incrementalMode: boolean;
    batchSize: number;
    embeddingModel: string;
    chunkingStrategy: 'semantic' | 'fixed' | 'adaptive';
  };
  notifications: {
    onStart: boolean;
    onComplete: boolean;
    onFailure: boolean;
    recipients: string[];
  };
}

export interface RetrainingProgress {
  jobId: string;
  agentId: string;
  status: TrainingStatus;
  progress: {
    sourcesProcessed: number;
    totalSources: number;
    chunksProcessed: number;
    totalChunks: number;
    embeddingsGenerated: number;
    estimatedTimeRemaining?: number;
  };
  performance: {
    averageProcessingTime: number;
    throughputPerSecond: number;
    memoryUsage: number;
    errorRate: number;
  };
  startedAt: string;
  estimatedCompletion?: string;
}

export class RAGRetrainingService {
  private static retrainingConfigs = new Map<string, RetrainingConfig>();
  private static activeJobs = new Map<string, RetrainingProgress>();

  // Configure retraining for an agent
  static configureRetraining(config: RetrainingConfig): void {
    this.retrainingConfigs.set(config.agentId, config);
    
    console.log('📚 Configured retraining for agent:', {
      agentId: config.agentId,
      triggers: config.triggers,
      incrementalMode: config.trainingOptions.incrementalMode
    });
  }

  // Check if retraining is needed for an agent
  static async shouldRetrain(agentId: string): Promise<{
    shouldRetrain: boolean;
    reasons: string[];
    urgency: 'low' | 'medium' | 'high';
  }> {
    const config = this.retrainingConfigs.get(agentId);
    if (!config) {
      return { shouldRetrain: false, reasons: ['No retraining config'], urgency: 'low' };
    }

    const reasons: string[] = [];
    let urgency: 'low' | 'medium' | 'high' = 'low';

    try {
      // Check for new sources
      const sources = await AgentSourceService.getSourcesByAgent(agentId);
      const recentSources = sources.filter(s => {
        const daysSinceCreation = (Date.now() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceCreation <= 7; // Sources added in last 7 days
      });

      if (recentSources.length >= config.triggers.newSourcesThreshold) {
        reasons.push(`${recentSources.length} new sources added`);
        urgency = 'medium';
      }

      // Check performance metrics
      const performanceData = RAGPerformanceMonitor.getAgentPerformance(agentId);
      if (performanceData && performanceData.averageRelevanceScore < config.triggers.performanceDropThreshold) {
        reasons.push(`Performance below threshold: ${performanceData.averageRelevanceScore}`);
        urgency = 'high';
      }

      // Check time-based trigger
      if (config.triggers.timeBasedInterval) {
        const lastJob = await TrainingJobService.getLatestJob(agentId);
        if (lastJob) {
          const daysSinceLastTraining = (Date.now() - new Date(lastJob.created_at).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceLastTraining >= config.triggers.timeBasedInterval) {
            reasons.push(`${daysSinceLastTraining} days since last training`);
            urgency = urgency === 'high' ? 'high' : 'medium';
          }
        }
      }

      // Manual trigger
      if (config.triggers.manualTrigger) {
        reasons.push('Manual retraining requested');
        urgency = 'medium';
      }

      return {
        shouldRetrain: reasons.length > 0,
        reasons,
        urgency
      };
    } catch (error) {
      console.error('❌ Error checking retraining needs:', error);
      return { shouldRetrain: false, reasons: ['Error checking conditions'], urgency: 'low' };
    }
  }

  // Start retraining process
  static async startRetraining(agentId: string, options?: {
    force?: boolean;
    incrementalOnly?: boolean;
  }): Promise<string> {
    console.log('🚀 Starting retraining for agent:', agentId);

    const config = this.retrainingConfigs.get(agentId);
    if (!config && !options?.force) {
      throw new Error('No retraining configuration found for agent');
    }

    try {
      // Check if retraining is already in progress
      const existingJob = Array.from(this.activeJobs.values())
        .find(job => job.agentId === agentId && job.status === 'in_progress');
      
      if (existingJob) {
        throw new Error('Retraining already in progress for this agent');
      }

      // Get sources to process
      const sources = await AgentSourceService.getSourcesByAgent(agentId);
      const sourcesToProcess = options?.incrementalOnly 
        ? sources.filter(s => {
            const daysSinceUpdate = (Date.now() - new Date(s.updated_at).getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceUpdate <= 7;
          })
        : sources;

      // Create training job
      const job = await TrainingJobService.createJob({
        agent_id: agentId,
        total_sources: sourcesToProcess.length,
        total_chunks: await this.estimateTotalChunks(sourcesToProcess.map(s => s.id))
      });

      // Initialize progress tracking
      const progress: RetrainingProgress = {
        jobId: job.id,
        agentId,
        status: 'pending',
        progress: {
          sourcesProcessed: 0,
          totalSources: sourcesToProcess.length,
          chunksProcessed: 0,
          totalChunks: job.total_chunks || 0,
          embeddingsGenerated: 0
        },
        performance: {
          averageProcessingTime: 0,
          throughputPerSecond: 0,
          memoryUsage: 0,
          errorRate: 0
        },
        startedAt: new Date().toISOString()
      };

      this.activeJobs.set(job.id, progress);

      // Start processing in background
      this.processRetrainingJob(job.id, sourcesToProcess, config || this.getDefaultConfig())
        .catch(error => {
          console.error('❌ Retraining job failed:', error);
          this.handleJobFailure(job.id, error.message);
        });

      return job.id;
    } catch (error) {
      console.error('❌ Failed to start retraining:', error);
      throw error;
    }
  }

  // Process retraining job
  private static async processRetrainingJob(
    jobId: string,
    sources: any[],
    config: RetrainingConfig
  ): Promise<void> {
    const progress = this.activeJobs.get(jobId);
    if (!progress) return;

    try {
      // Update job status
      await TrainingJobService.startJob(jobId);
      progress.status = 'in_progress';

      const startTime = Date.now();
      let totalChunksProcessed = 0;
      let totalEmbeddingsGenerated = 0;

      // Process sources in batches
      const batchSize = config.trainingOptions.batchSize;
      for (let i = 0; i < sources.length; i += batchSize) {
        const batch = sources.slice(i, i + batchSize);
        
        for (const source of batch) {
          const batchStartTime = Date.now();
          
          try {
            // Get or create chunks for this source
            const chunks = await SourceChunkService.getChunksBySource(source.id);
            
            // Generate embeddings if needed
            for (const chunk of chunks) {
              await EmbeddingService.generateEmbedding(
                chunk.id,
                chunk.content,
                config.trainingOptions.embeddingModel
              );
              totalEmbeddingsGenerated++;
            }

            totalChunksProcessed += chunks.length;

            // Update progress
            progress.progress.sourcesProcessed++;
            progress.progress.chunksProcessed = totalChunksProcessed;
            progress.progress.embeddingsGenerated = totalEmbeddingsGenerated;

            // Update performance metrics
            const batchTime = Date.now() - batchStartTime;
            progress.performance.averageProcessingTime = 
              (progress.performance.averageProcessingTime + batchTime) / 2;
            
            // Estimate completion time
            const elapsed = Date.now() - startTime;
            const remaining = sources.length - progress.progress.sourcesProcessed;
            const avgTimePerSource = elapsed / progress.progress.sourcesProcessed;
            progress.progress.estimatedTimeRemaining = remaining * avgTimePerSource;

          } catch (error) {
            console.error('❌ Error processing source:', source.id, error);
            progress.performance.errorRate = 
              (progress.performance.errorRate + 1) / progress.progress.sourcesProcessed;
          }
        }

        // Update job in database
        await TrainingJobService.updateJob(jobId, {
          processed_sources: progress.progress.sourcesProcessed,
          processed_chunks: progress.progress.chunksProcessed
        });
      }

      // Complete the job
      await TrainingJobService.completeJob(jobId);
      progress.status = 'completed';

      console.log('✅ Retraining completed for job:', jobId);

      // Send notifications if configured
      if (config.notifications.onComplete) {
        await this.sendNotification(
          config.notifications.recipients,
          'Retraining Completed',
          `Agent ${config.agentId} retraining completed successfully`
        );
      }

    } catch (error) {
      await this.handleJobFailure(jobId, error.message);
      throw error;
    }
  }

  // Handle job failure
  private static async handleJobFailure(jobId: string, errorMessage: string): Promise<void> {
    const progress = this.activeJobs.get(jobId);
    if (progress) {
      progress.status = 'failed';
      await TrainingJobService.failJob(jobId, errorMessage);
      
      const config = this.retrainingConfigs.get(progress.agentId);
      if (config?.notifications.onFailure) {
        await this.sendNotification(
          config.notifications.recipients,
          'Retraining Failed',
          `Agent ${progress.agentId} retraining failed: ${errorMessage}`
        );
      }
    }
  }

  // Get retraining progress
  static getRetrainingProgress(jobId: string): RetrainingProgress | null {
    return this.activeJobs.get(jobId) || null;
  }

  // Get all active retraining jobs
  static getActiveJobs(): RetrainingProgress[] {
    return Array.from(this.activeJobs.values())
      .filter(job => job.status === 'in_progress');
  }

  // Cancel retraining job
  static async cancelRetraining(jobId: string): Promise<boolean> {
    const progress = this.activeJobs.get(jobId);
    if (!progress || progress.status !== 'in_progress') {
      return false;
    }

    try {
      await TrainingJobService.failJob(jobId, 'Cancelled by user');
      progress.status = 'failed';
      this.activeJobs.delete(jobId);
      
      console.log('🛑 Cancelled retraining job:', jobId);
      return true;
    } catch (error) {
      console.error('❌ Failed to cancel retraining:', error);
      return false;
    }
  }

  // Utility methods
  private static async estimateTotalChunks(sourceIds: string[]): Promise<number> {
    let totalChunks = 0;
    for (const sourceId of sourceIds) {
      const chunks = await SourceChunkService.getChunksBySource(sourceId);
      totalChunks += chunks.length;
    }
    return totalChunks;
  }

  private static getDefaultConfig(): RetrainingConfig {
    return {
      agentId: '',
      triggers: {
        newSourcesThreshold: 5,
        performanceDropThreshold: 0.7,
        timeBasedInterval: 30
      },
      trainingOptions: {
        incrementalMode: true,
        batchSize: 10,
        embeddingModel: 'text-embedding-3-small',
        chunkingStrategy: 'semantic'
      },
      notifications: {
        onStart: false,
        onComplete: true,
        onFailure: true,
        recipients: []
      }
    };
  }

  private static async sendNotification(
    recipients: string[],
    subject: string,
    message: string
  ): Promise<void> {
    // Placeholder for notification implementation
    console.log('📧 Notification:', { recipients, subject, message });
  }

  // Cleanup completed jobs
  static cleanupCompletedJobs(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [jobId, progress] of this.activeJobs.entries()) {
      if (progress.status !== 'in_progress' && 
          new Date(progress.startedAt).getTime() < cutoffTime) {
        this.activeJobs.delete(jobId);
      }
    }
  }
}
