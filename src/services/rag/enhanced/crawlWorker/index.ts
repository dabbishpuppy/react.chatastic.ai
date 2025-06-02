
import { WorkerCore } from './workerCore';
import { ChunkProcessor } from './chunkProcessor';

export { WorkerCore } from './workerCore';
export { ChunkProcessor } from './chunkProcessor';

// Main service class for backward compatibility
export class CrawlWorkerService {
  static async startWorker(): Promise<void> {
    return WorkerCore.startWorker();
  }

  static stopWorker(): void {
    return WorkerCore.stopWorker();
  }

  static getWorkerStatus() {
    return WorkerCore.getWorkerStatus();
  }

  // Legacy method for chunk creation
  static createSemanticChunks(content: string, maxTokens?: number): string[] {
    return ChunkProcessor.createSemanticChunks(content, maxTokens);
  }
}
