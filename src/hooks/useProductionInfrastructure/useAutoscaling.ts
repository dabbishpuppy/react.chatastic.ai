
import { useState, useCallback } from 'react';
import { AutoscalingService } from '@/services/rag/enhanced';
import { useToast } from '@/hooks/use-toast';
import { validateAutoscalingStatus } from './dataValidation';
import type { ValidatedAutoscalingStatus } from './types';

export const useAutoscaling = () => {
  const [autoscalingStatus, setAutoscalingStatus] = useState<ValidatedAutoscalingStatus | null>(null);
  const { toast } = useToast();

  const loadAutoscalingStatus = useCallback(async () => {
    try {
      const status = await AutoscalingService.getAutoscalingStatus();
      const validatedStatus = validateAutoscalingStatus(status);
      setAutoscalingStatus(validatedStatus);
    } catch (error) {
      console.error('Failed to load autoscaling status:', error);
      const fallbackStatus = validateAutoscalingStatus(null);
      setAutoscalingStatus(fallbackStatus);
    }
  }, []);

  const startAutoscaling = useCallback(async () => {
    try {
      await AutoscalingService.startAutoscaling();
      toast({
        title: "Autoscaling Started",
        description: "Production autoscaling is now active",
      });
      await loadAutoscalingStatus();
    } catch (error) {
      console.error('Failed to start autoscaling:', error);
      toast({
        title: "Failed to Start Autoscaling",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  }, [loadAutoscalingStatus, toast]);

  const manualScale = useCallback(async (targetWorkers: number) => {
    try {
      const success = await AutoscalingService.manualScale(targetWorkers, 'Manual scaling from UI');
      if (success) {
        toast({
          title: "Scaling Initiated",
          description: `Scaling to ${targetWorkers} workers`,
        });
        await loadAutoscalingStatus();
      }
    } catch (error) {
      console.error('Failed to scale workers:', error);
      toast({
        title: "Scaling Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  }, [loadAutoscalingStatus, toast]);

  return {
    autoscalingStatus,
    loadAutoscalingStatus,
    startAutoscaling,
    manualScale
  };
};
