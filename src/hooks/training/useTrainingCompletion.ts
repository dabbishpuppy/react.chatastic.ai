
import { TrainingProgress, TrainingRefs } from './types';
import { TrainingValidationService } from './services/trainingValidationService';
import { TrainingSourceAnalysisService } from './services/trainingSourceAnalysisService';
import { TrainingStatusDeterminationService } from './services/trainingStatusDeterminationService';
import { TrainingCompletionHandlerService } from './services/trainingCompletionHandlerService';

export const useTrainingCompletion = (
  refs: TrainingRefs,
  shouldPreventTrainingAction: (action: 'start' | 'check', sessionId?: string) => boolean,
  markAgentCompletion: (sessionId: string) => void,
  setTrainingProgress: React.Dispatch<React.SetStateAction<TrainingProgress | null>>
) => {
  const checkTrainingCompletion = async (agentId: string) => {
    try {
      const now = Date.now();
      
      // ENHANCED: Multiple early exit conditions
      if (shouldPreventTrainingAction('check')) {
        console.log('🚫 AGENT-LEVEL: Prevented checkTrainingCompletion');
        return;
      }
      
      // ENHANCED: Stronger completion state protection
      if (refs.agentCompletionStateRef.current.isCompleted) {
        const timeSinceCompletion = now - refs.agentCompletionStateRef.current.completedAt;
        if (timeSinceCompletion < 120000) { // Extended to 2 minutes
          console.log('🚫 ENHANCED: Ignoring completion check - agent completed recently (within 2 minutes)');
          return;
        }
      }

      // ENHANCED: Check training state - Fixed type issue
      if (refs.trainingStateRef.current === 'completed') {
        console.log('🚫 ENHANCED: Ignoring completion check - training state is completed');
        return;
      }

      // ENHANCED: Dialog protection - skip polling if dialog is locked
      if (refs.dialogLockedRef.current) {
        console.log('🚫 ENHANCED: Ignoring completion check - dialog is locked');
        return;
      }

      // ENHANCED: Debounce with longer window
      if (now - refs.lastCompletionCheckRef.current < 5000) { // Increased from 3s to 5s
        console.log('🚫 Enhanced debounced checkTrainingCompletion call');
        return;
      }
      refs.lastCompletionCheckRef.current = now;

      // Analyze agent sources
      const analysisResult = await TrainingSourceAnalysisService.analyzeAgentSources(agentId);

      const calculatedProgress = analysisResult.totalPagesNeedingProcessing > 0 ? 
        Math.round((analysisResult.totalPagesProcessed / analysisResult.totalPagesNeedingProcessing) * 100) : 100;

      // Determine training status
      const status = await TrainingStatusDeterminationService.determineTrainingStatus(
        analysisResult,
        refs,
        agentId
      );

      let sessionId = refs.currentTrainingSessionRef.current;
      
      if (!sessionId && !refs.agentCompletionStateRef.current.isCompleted) {
        sessionId = `${agentId}-${Date.now()}`;
        refs.currentTrainingSessionRef.current = sessionId;
        refs.currentSessionIdRef.current = sessionId;
        console.log('🆔 Created new session:', sessionId);
      } else if (!sessionId && refs.agentCompletionStateRef.current.isCompleted) {
        sessionId = refs.agentCompletionStateRef.current.lastCompletedSessionId || `${agentId}-completed`;
        console.log('🔒 Using last completed session ID to prevent regeneration:', sessionId);
      }

      const newProgress: TrainingProgress = {
        agentId,
        status,
        progress: calculatedProgress,
        totalSources: analysisResult.totalPagesNeedingProcessing,
        processedSources: analysisResult.totalPagesProcessed,
        totalChunks: 0, // Will be populated by backend
        processedChunks: 0, // Will be populated by backend
        currentlyProcessing: analysisResult.currentlyProcessingPages,
        sessionId
      };

      console.log('📊 ENHANCED Training status update:', {
        status,
        sessionId,
        progress: calculatedProgress,
        sourcesNeedingTraining: analysisResult.sourcesNeedingTraining.length,
        currentState: refs.trainingStateRef.current,
        agentCompleted: refs.agentCompletionStateRef.current.isCompleted,
        lastAction: refs.lastTrainingActionRef.current,
        activeSession: refs.activeTrainingSessionRef.current,
        dialogLocked: refs.dialogLockedRef.current
      });

      setTrainingProgress(newProgress);

      // Store previous status before updating
      const previousStatus = refs.trainingStateRef.current;
      
      // Update training state ref - now types match properly
      refs.trainingStateRef.current = status;

      // Handle training completion - FIXED: Only trigger completion when transitioning TO completed AND all content is processed
      if (status === 'completed' && 
          previousStatus !== 'completed' &&
          analysisResult.totalPagesNeedingProcessing > 0 &&
          analysisResult.totalPagesProcessed === analysisResult.totalPagesNeedingProcessing &&
          !refs.completedSessionsRef.current.has(sessionId) &&
          !refs.agentCompletionStateRef.current.isCompleted) {
        
        TrainingCompletionHandlerService.handleTrainingCompletion(
          sessionId,
          agentId,
          refs,
          markAgentCompletion,
          newProgress
        );
      }

      // Handle training failure
      if (status === 'failed' && previousStatus !== 'failed') {
        TrainingCompletionHandlerService.handleTrainingFailure(sessionId, refs);
      }

    } catch (error) {
      console.error('Error in ENHANCED checkTrainingCompletion:', error);
      setTrainingProgress(prev => prev ? { ...prev, status: 'failed' } : null);
    }
  };

  return {
    checkTrainingCompletion,
    markParentSourcesAsTrained: TrainingCompletionHandlerService.markParentSourcesAsTrained
  };
};
