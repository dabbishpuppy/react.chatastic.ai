
import { CrawlJobProcessor } from './CrawlJobProcessor';
import { TrainingJobProcessor } from './TrainingJobProcessor';
import { BackgroundJobProcessor } from './BackgroundJobProcessor';

/**
 * Manages all background job processors
 */
export class JobProcessorManager {
  private processors: Map<string, BackgroundJobProcessor> = new Map();
  private isStarted: boolean = false;

  constructor() {
    // Register processors
    this.processors.set('crawl_pages', new CrawlJobProcessor());
    this.processors.set('train_pages', new TrainingJobProcessor());
  }

  /**
   * Start all processors
   */
  async startAll(): Promise<void> {
    if (this.isStarted) {
      console.log('Job processors already started');
      return;
    }

    console.log('🚀 Starting all job processors...');
    
    const startPromises = Array.from(this.processors.values()).map(processor => 
      processor.start()
    );

    await Promise.all(startPromises);
    this.isStarted = true;
    
    console.log('✅ All job processors started');
  }

  /**
   * Stop all processors
   */
  stopAll(): void {
    if (!this.isStarted) {
      console.log('Job processors not started');
      return;
    }

    console.log('🛑 Stopping all job processors...');
    
    this.processors.forEach(processor => processor.stop());
    this.isStarted = false;
    
    console.log('✅ All job processors stopped');
  }

  /**
   * Start a specific processor
   */
  async startProcessor(jobType: string): Promise<void> {
    const processor = this.processors.get(jobType);
    if (!processor) {
      throw new Error(`Unknown job type: ${jobType}`);
    }

    await processor.start();
    console.log(`✅ Started processor for job type: ${jobType}`);
  }

  /**
   * Stop a specific processor
   */
  stopProcessor(jobType: string): void {
    const processor = this.processors.get(jobType);
    if (!processor) {
      throw new Error(`Unknown job type: ${jobType}`);
    }

    processor.stop();
    console.log(`✅ Stopped processor for job type: ${jobType}`);
  }

  /**
   * Get status of all processors
   */
  getStatus(): Record<string, { isRunning: boolean }> {
    const status: Record<string, { isRunning: boolean }> = {};
    
    this.processors.forEach((processor, jobType) => {
      status[jobType] = processor.getStatus();
    });

    return status;
  }

  /**
   * Get the manager instance status
   */
  getManagerStatus(): {
    isStarted: boolean;
    processorCount: number;
    activeProcessors: string[];
  } {
    const activeProcessors = Array.from(this.processors.entries())
      .filter(([, processor]) => processor.getStatus().isRunning)
      .map(([jobType]) => jobType);

    return {
      isStarted: this.isStarted,
      processorCount: this.processors.size,
      activeProcessors
    };
  }
}

// Global instance
export const jobProcessorManager = new JobProcessorManager();
