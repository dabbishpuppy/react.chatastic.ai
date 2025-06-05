
import { TrainingRefs } from '../types';

export interface TrainingSourceAnalysisResult {
  totalPagesNeedingProcessing: number;
  totalPagesProcessed: number;
  sourcesNeedingTraining: any[];
  currentlyProcessingPages: string[];
}

export class TrainingStatusDeterminationService {
  static async determineTrainingStatus(
    analysisResult: TrainingSourceAnalysisResult,
    refs: TrainingRefs,
    agentId: string
  ): Promise<'idle' | 'initializing' | 'training' | 'completed' | 'failed'> {
    const { totalPagesNeedingProcessing, totalPagesProcessed, sourcesNeedingTraining } = analysisResult;

    // If there are sources that need training and none processed yet, it's initializing
    if (sourcesNeedingTraining.length > 0 && totalPagesProcessed === 0) {
      return 'initializing';
    }

    // If there are sources being processed, it's training
    if (sourcesNeedingTraining.length > 0 && totalPagesProcessed > 0 && totalPagesProcessed < totalPagesNeedingProcessing) {
      return 'training';
    }

    // If all sources are processed, it's completed
    if (totalPagesNeedingProcessing > 0 && totalPagesProcessed === totalPagesNeedingProcessing) {
      return 'completed';
    }

    // If no sources need processing, it's idle (up to date)
    if (totalPagesNeedingProcessing === 0) {
      return 'idle';
    }

    // Default to idle
    return 'idle';
  }
}
