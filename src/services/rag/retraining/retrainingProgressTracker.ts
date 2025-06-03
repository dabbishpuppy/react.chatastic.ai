
import { RetrainingProgress } from '../types/retrainingTypes';

export class RetrainingProgressTracker {
  private static progressCallbacks = new Map<string, (progress: RetrainingProgress) => void>();

  static setProgressCallback(agentId: string, callback: (progress: RetrainingProgress) => void): void {
    this.progressCallbacks.set(agentId, callback);
  }

  static removeProgressCallback(agentId: string): void {
    this.progressCallbacks.delete(agentId);
  }

  static updateProgress(agentId: string, progress: RetrainingProgress): void {
    const callback = this.progressCallbacks.get(agentId);
    if (callback) {
      callback(progress);
    }
  }

  static createInitialProgress(totalSources: number): RetrainingProgress {
    return {
      totalSources,
      processedSources: 0,
      totalChunks: 0,
      processedChunks: 0,
      status: 'processing'
    };
  }

  static createCompletedProgress(totalSources: number, processedSources: number): RetrainingProgress {
    return {
      totalSources,
      processedSources,
      totalChunks: 0,
      processedChunks: 0,
      status: 'completed',
      currentSource: undefined
    };
  }

  static createErrorProgress(error: string): RetrainingProgress {
    return {
      totalSources: 0,
      processedSources: 0,
      totalChunks: 0,
      processedChunks: 0,
      status: 'failed',
      error
    };
  }
}
