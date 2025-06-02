
import { useState, useCallback } from 'react';
import { ProductionInfrastructureService } from '@/services/rag/enhanced';
import { useToast } from '@/hooks/use-toast';
import { validateInfrastructureHealth } from './dataValidation';
import type { ValidatedInfrastructureHealth } from './types';

export const useInfrastructureHealth = () => {
  const [infrastructureHealth, setInfrastructureHealth] = useState<ValidatedInfrastructureHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadInfrastructureHealth = useCallback(async () => {
    try {
      setLoading(true);
      const health = await ProductionInfrastructureService.getInfrastructureHealth();
      const validatedHealth = validateInfrastructureHealth(health);
      
      console.log('📊 Infrastructure health:', `${validatedHealth.healthPercentage}%`, validatedHealth.healthy ? '(healthy)' : '(critical)');
      setInfrastructureHealth(validatedHealth);
    } catch (error) {
      console.error('Failed to load infrastructure health:', error);
      
      const fallbackHealth = validateInfrastructureHealth(null);
      fallbackHealth.errorRate = 1.0;
      fallbackHealth.status = 'error';
      setInfrastructureHealth(fallbackHealth);
      
      toast({
        title: "Warning",
        description: "Infrastructure health monitoring unavailable",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const optimizeInfrastructure = useCallback(async () => {
    try {
      setLoading(true);
      const result = await ProductionInfrastructureService.optimizeInfrastructure();
      
      toast({
        title: "Infrastructure Optimized",
        description: `Applied ${result.optimizations.length} optimizations. Expected improvement: ${result.expectedImprovementPercent}%`,
      });
      
      await loadInfrastructureHealth();
      return result;
    } catch (error) {
      console.error('Failed to optimize infrastructure:', error);
      toast({
        title: "Optimization Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadInfrastructureHealth, toast]);

  return {
    infrastructureHealth,
    loading,
    loadInfrastructureHealth,
    optimizeInfrastructure
  };
};
