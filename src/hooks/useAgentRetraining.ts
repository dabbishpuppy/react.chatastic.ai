
import { useState, useCallback } from 'react';
import { RetrainingService, type RetrainingProgress } from '@/services/rag/retrainingService';
import { useToast } from '@/hooks/use-toast';

export const useAgentRetraining = (agentId?: string) => {
  const [isRetraining, setIsRetraining] = useState(false);
  const [progress, setProgress] = useState<RetrainingProgress | null>(null);
  const [retrainingNeeded, setRetrainingNeeded] = useState<{
    needed: boolean;
    unprocessedSources: number;
    reasons: string[];
  } | null>(null);
  
  const { toast } = useToast();

  const checkRetrainingNeeded = useCallback(async () => {
    if (!agentId) return;

    try {
      const result = await RetrainingService.checkRetrainingNeeded(agentId);
      setRetrainingNeeded(result);
      return result;
    } catch (error) {
      console.error('Failed to check retraining status:', error);
      toast({
        title: "Error",
        description: "Failed to check retraining status",
        variant: "destructive"
      });
    }
  }, [agentId, toast]);

  const startRetraining = useCallback(async () => {
    if (!agentId || isRetraining) return;

    setIsRetraining(true);
    setProgress({
      totalSources: 0,
      processedSources: 0,
      totalChunks: 0,
      processedChunks: 0,
      status: 'pending'
    });

    try {
      toast({
        title: "Retraining Started",
        description: "Processing your sources and generating embeddings..."
      });

      const success = await RetrainingService.retrainAgent(agentId, (newProgress) => {
        setProgress(newProgress);
      });

      if (success) {
        toast({
          title: "Retraining Complete",
          description: "Your agent has been successfully retrained with all sources"
        });
        
        // Refresh retraining status
        await checkRetrainingNeeded();
      } else {
        toast({
          title: "Retraining Failed",
          description: "Some sources could not be processed",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Retraining failed:', error);
      toast({
        title: "Retraining Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsRetraining(false);
    }
  }, [agentId, isRetraining, toast, checkRetrainingNeeded]);

  return {
    isRetraining,
    progress,
    retrainingNeeded,
    startRetraining,
    checkRetrainingNeeded
  };
};
