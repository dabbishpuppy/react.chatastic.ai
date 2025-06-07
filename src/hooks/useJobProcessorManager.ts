
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProcessorStatus {
  isRunning: boolean;
  lastPing?: Date;
}

export const useJobProcessorManager = () => {
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processorStatus, setProcessorStatus] = useState<Record<string, ProcessorStatus>>({
    crawl_pages: { isRunning: false },
    train_pages: { isRunning: false }
  });
  const { toast } = useToast();

  const startProcessors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Call the workflow job processor edge function
      const { data, error } = await supabase.functions.invoke('workflow-job-processor', {
        method: 'POST'
      });

      if (error) throw error;

      // Start the realtime processor
      await supabase.functions.invoke('workflow-realtime', {
        method: 'POST'
      });

      setIsStarted(true);
      setProcessorStatus({
        crawl_pages: { isRunning: true, lastPing: new Date() },
        train_pages: { isRunning: true, lastPing: new Date() }
      });

      toast({
        title: 'Processors Started',
        description: 'Background job processors are now running.',
      });

    } catch (error: any) {
      setError(error.message);
      toast({
        title: 'Failed to Start Processors',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const stopProcessors = useCallback(async () => {
    setIsLoading(true);
    
    try {
      setIsStarted(false);
      setProcessorStatus({
        crawl_pages: { isRunning: false },
        train_pages: { isRunning: false }
      });

      toast({
        title: 'Processors Stopped',
        description: 'Background job processors have been stopped.',
      });

    } catch (error: any) {
      setError(error.message);
      toast({
        title: 'Failed to Stop Processors',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const startProcessor = useCallback(async (jobType: string) => {
    setIsLoading(true);
    
    try {
      setProcessorStatus(prev => ({
        ...prev,
        [jobType]: { isRunning: true, lastPing: new Date() }
      }));

      toast({
        title: 'Processor Started',
        description: `${jobType} processor is now running.`,
      });

    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const stopProcessor = useCallback(async (jobType: string) => {
    setIsLoading(true);
    
    try {
      setProcessorStatus(prev => ({
        ...prev,
        [jobType]: { isRunning: false }
      }));

      toast({
        title: 'Processor Stopped',
        description: `${jobType} processor has been stopped.`,
      });

    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    isStarted,
    processorStatus,
    isLoading,
    error,
    startProcessors,
    stopProcessors,
    startProcessor,
    stopProcessor
  };
};
