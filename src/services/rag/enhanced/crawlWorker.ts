
// Re-export the modular crawl worker services for backward compatibility
export { CrawlWorkerService, WorkerCore, ChunkProcessor } from './crawlWorker';

// Legacy exports - these now point to the modular implementation
import { CrawlWorkerService } from './crawlWorker';

export class CrawlWorkerServiceLegacy {
  static async startWorker(): Promise<void> {
    return CrawlWorkerService.startWorker();
  }

  static stopWorker(): void {
    return CrawlWorkerService.stopWorker();
  }

  static getWorkerStatus() {
    return CrawlWorkerService.getWorkerStatus();
  }

  static createSemanticChunks(content: string, maxTokens?: number): string[] {
    return CrawlWorkerService.createSemanticChunks(content, maxTokens);
  }
}

// Default export for backward compatibility
export default CrawlWorkerServiceLegacy;
