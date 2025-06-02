
import { useState, useCallback } from 'react';
import { MonitoringAndAlertingService } from '@/services/rag/enhanced';
import { useToast } from '@/hooks/use-toast';
import { validateSystemHealth } from './dataValidation';
import type { ValidatedSystemHealth } from './types';

export const useSystemHealth = () => {
  const [systemHealth, setSystemHealth] = useState<ValidatedSystemHealth | null>(null);
  const { toast } = useToast();

  const loadSystemHealth = useCallback(async () => {
    try {
      const health = await MonitoringAndAlertingService.getSystemHealthSummary();
      const validatedSystemHealth = validateSystemHealth(health);
      setSystemHealth(validatedSystemHealth);
    } catch (error) {
      console.error('Failed to load system health:', error);
      const fallbackHealth = validateSystemHealth(null);
      setSystemHealth(fallbackHealth);
    }
  }, []);

  const startMonitoring = useCallback(async () => {
    try {
      await MonitoringAndAlertingService.startMonitoring();
      toast({
        title: "Monitoring Started",
        description: "Production monitoring and alerting is now active",
      });
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      toast({
        title: "Failed to Start Monitoring",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  }, [toast]);

  return {
    systemHealth,
    loadSystemHealth,
    startMonitoring
  };
};
