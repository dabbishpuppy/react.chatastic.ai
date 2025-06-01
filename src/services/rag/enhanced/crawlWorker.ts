import { supabase } from "@/integrations/supabase/client";
import { WorkerQueueService, CrawlJob } from "./workerQueue";
import { CompressionEngine } from "./compressionEngine";
import { ChunkPruningService } from "./chunkPruning";
import { GlobalDeduplicationService } from "./globalDeduplication";

export class CrawlWorkerService {
  private static workerId: string = `worker-${Math.random().toString(36).substr(2, 9)}`;
  private static isRunning: boolean = false;
  private static stopRequested: boolean = false;

  // Start the worker loop
  static async startWorker(): Promise<void> {
    if (this.isRunning) {
      console.log('Worker already running');
      return;
    }

    this.isRunning = true;
    this.stopRequested = false;
    
    console.log(`🚀 Starting crawl worker ${this.workerId}`);

    while (!this.stopRequested) {
      try {
        await this.processNextJob();
        
        // Small delay to prevent tight polling
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Worker error:', error);
        
        // Exponential backoff on errors
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    this.isRunning = false;
    console.log(`🛑 Crawl worker ${this.workerId} stopped`);
  }

  // Stop the worker
  static stopWorker(): void {
    this.stopRequested = true;
  }

  // Process a single job
  private static async processNextJob(): Promise<void> {
    const job = await WorkerQueueService.getNextJob(this.workerId);
    
    if (!job) {
      return; // No jobs available
    }

    console.log(`🔄 Processing job ${job.id} for URL: ${job.url}`);
    
    const startTime = Date.now();

    try {
      // Update job to in_progress
      await WorkerQueueService.updateJobStatus(job.id, 'in_progress', {
        startedAt: new Date().toISOString()
      });

      // Fetch and process the page
      const result = await this.processPage(job);

      const processingTime = Date.now() - startTime;

      // Update job to completed
      await WorkerQueueService.updateJobStatus(job.id, 'completed', {
        completedAt: new Date().toISOString(),
        processingTimeMs: processingTime,
        contentSize: result.contentSize,
        compressionRatio: result.compressionRatio,
        chunksCreated: result.chunksCreated,
        duplicatesFound: result.duplicatesFound
      });

      console.log(`✅ Job ${job.id} completed in ${processingTime}ms`);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`❌ Job ${job.id} failed:`, errorMessage);

      // Check if we should retry
      if (job.retryCount < job.maxRetries) {
        await WorkerQueueService.updateJobStatus(job.id, 'pending', {
          errorMessage
        });
        
        // Increment retry count will be handled by retryFailedJobs
      } else {
        await WorkerQueueService.updateJobStatus(job.id, 'failed', {
          completedAt: new Date().toISOString(),
          processingTimeMs: processingTime,
          errorMessage
        });
      }
    }
  }

  // Process a single page
  private static async processPage(job: CrawlJob): Promise<{
    contentSize: number;
    compressionRatio: number;
    chunksCreated: number;
    duplicatesFound: number;
  }> {
    // Fetch page with timeout and proper headers
    const response = await fetch(job.url, {
      headers: {
        'User-Agent': 'WonderWave-Bot/2.0 (+https://wonderwave.no/bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(45000) // 45 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const originalSize = html.length;

    // Clean and extract content
    const cleanedContent = CompressionEngine.cleanContentForCompression(html);
    
    // Create semantic chunks
    const chunks = this.createSemanticChunks(cleanedContent);
    
    // Prune to keep only high-quality chunks
    const prunedChunks = ChunkPruningService.pruneChunks(chunks, 5);
    const highQualityChunks = prunedChunks.filter(chunk => chunk.isHighValue).map(chunk => chunk.content);

    // Process with global deduplication
    const deduplicationResult = await GlobalDeduplicationService.processChunksGlobally(
      highQualityChunks,
      job.parentSourceId,
      job.customerId
    );

    // Calculate compression ratio
    const compressionRatio = deduplicationResult.totalCompressedSize / originalSize;

    return {
      contentSize: originalSize,
      compressionRatio,
      chunksCreated: deduplicationResult.uniqueChunks,
      duplicatesFound: deduplicationResult.duplicateChunks
    };
  }

  // Create semantic chunks from content
  private static createSemanticChunks(content: string, maxTokens: number = 150): string[] {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
    const chunks: string[] = [];
    let currentChunk = '';
    let tokenCount = 0;

    for (const sentence of sentences) {
      const sentenceTokens = sentence.trim().split(/\s+/).length;
      
      if (tokenCount + sentenceTokens > maxTokens && currentChunk) {
        if (currentChunk.trim().length > 30) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
        tokenCount = sentenceTokens;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
        tokenCount += sentenceTokens;
      }
    }
    
    if (currentChunk.trim().length > 30) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 20);
  }

  // Get worker status
  static getWorkerStatus(): {
    workerId: string;
    isRunning: boolean;
    stopRequested: boolean;
  } {
    return {
      workerId: this.workerId,
      isRunning: this.isRunning,
      stopRequested: this.stopRequested
    };
  }
}
