
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ResilientCrawlService } from '@/services/rag/enhanced/resilientCrawlService';
import { ResilienceStartupService } from '@/services/rag/enhanced/resilienceStartup';

export const useResilientCrawl = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [systemHealth, setSystemHealth] = useState<'healthy' | 'degraded' | 'critical'>('healthy');
  const { toast } = useToast();

  useEffect(() => {
    const initializeResilience = async () => {
      try {
        await ResilienceStartupService.initialize();
        setIsInitialized(true);
        
        // Set up periodic health updates
        const healthInterval = setInterval(async () => {
          const status = await ResilienceStartupService.getSystemStatus();
          setSystemHealth(status.overallHealth);
        }, 30000); // Check every 30 seconds

        return () => clearInterval(healthInterval);
      } catch (error) {
        console.error('Failed to initialize resilience system:', error);
        toast({
          title: 'System Warning',
          description: 'Background monitoring could not be started. Crawling may be less reliable.',
          variant: 'destructive',
        });
      }
    };

    initializeResilience();
  }, [toast]);

  const initiateCrawl = async (url: string, options: any) => {
    try {
      const result = await ResilientCrawlService.initiateCrawlWithResilience(url, options);
      
      if (!result.success) {
        throw new Error(result.error || 'Crawl initiation failed');
      }

      return result;
    } catch (error) {
      console.error('Resilient crawl failed:', error);
      throw error;
    }
  };

  const triggerRecovery = async () => {
    try {
      const result = await ResilientCrawlService.triggerManualRecovery();
      
      toast({
        title: result.success ? 'Recovery Successful' : 'Recovery Failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });

      return result;
    } catch (error) {
      toast({
        title: 'Recovery Error',
        description: 'Failed to trigger manual recovery',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const getHealthStatus = () => {
    return ResilientCrawlService.getCurrentHealth();
  };

  return {
    isInitialized,
    systemHealth,
    initiateCrawl,
    triggerRecovery,
    getHealthStatus
  };
};
