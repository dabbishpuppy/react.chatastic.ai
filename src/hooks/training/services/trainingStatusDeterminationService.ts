
import { TrainingRefs } from '../types';
import { TrainingValidationService } from './trainingValidationService';
import { SourceAnalysisResult } from './trainingSourceAnalysisService';

export class TrainingStatusDeterminationService {
  static async determineTrainingStatus(
    analysisResult: SourceAnalysisResult,
    refs: TrainingRefs,
    agentId: string
  ): Promise<'idle' | 'initializing' | 'training' | 'completed' | 'failed'> {
    const {
      sourcesNeedingTraining,
      totalPagesNeedingProcessing,
      totalPagesProcessed,
      currentlyProcessingPages,
      hasFailedSources
    } = analysisResult;

    const calculatedProgress = totalPagesNeedingProcessing > 0 ? 
      Math.round((totalPagesProcessed / totalPagesNeedingProcessing) * 100) : 100;

    // Validate if training is actually complete
    const isActuallyComplete = await TrainingValidationService.validateTrainingCompletion(agentId);

    let status: 'idle' | 'initializing' | 'training' | 'completed' | 'failed' = 'idle';
    
    console.log('🔍 ENHANCED Status determination:', {
      sourcesNeedingTraining: sourcesNeedingTraining.length,
      currentlyProcessingPages: currentlyProcessingPages.length,
      hasFailedSources,
      totalPagesNeedingProcessing,
      totalPagesProcessed,
      activeTrainingSession: refs.activeTrainingSessionRef.current,
      isActuallyComplete,
      calculatedProgress,
      agentAlreadyCompleted: refs.agentCompletionStateRef.current.isCompleted
    });

    // Status determination with stronger completion protection
    if (isActuallyComplete) {
      status = 'completed';
      console.log('✅ Status: COMPLETED (validated - has chunks and all sources processed)');
      
      // Force cleanup of stuck training state
      if (refs.activeTrainingSessionRef.current) {
        console.log('🧹 ENHANCED CLEANUP: Clearing stuck training session state');
        refs.activeTrainingSessionRef.current = '';
        refs.trainingStartTimeRef.current = 0;
        refs.globalTrainingActiveRef.current = false;
      }
    } else if (hasFailedSources && sourcesNeedingTraining.length === 0) {
      status = 'failed';
      console.log('❌ Status: FAILED (has failed sources, no pending)');
    } else if (currentlyProcessingPages.length > 0 || refs.activeTrainingSessionRef.current) {
      status = 'training';
      console.log('🔄 Status: TRAINING (pages currently processing or active session)');
      
      // Recovery mechanism - if progress is 100% but still showing training, validate
      if (calculatedProgress === 100 && currentlyProcessingPages.length === 0) {
        console.log('🔍 ENHANCED RECOVERY: Progress 100% but status training - validating completion');
        const recoveryValidation = await TrainingValidationService.validateTrainingCompletion(agentId);
        if (recoveryValidation) {
          status = 'completed';
          console.log('✅ ENHANCED RECOVERY: Forced status to completed after validation');
        }
      }
    } else if (sourcesNeedingTraining.length === 0 && totalPagesNeedingProcessing > 0) {
      status = 'completed';
      console.log('✅ Status: COMPLETED (no sources need training, all processed)');
    } else {
      status = 'idle';
      console.log('⏸️ Status: IDLE (default state)');
    }

    return status;
  }
}
