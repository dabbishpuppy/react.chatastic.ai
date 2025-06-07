
import { useEffect, useState } from 'react';
import { WorkflowStartupService } from '@/services/workflow/WorkflowStartupService';
import { useToast } from '@/hooks/use-toast';

export const useWorkflowSystem = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initializeWorkflow = async () => {
      if (WorkflowStartupService.isReady()) {
        setIsInitialized(true);
        return;
      }

      setIsInitializing(true);
      setError(null);

      try {
        await WorkflowStartupService.initialize();
        setIsInitialized(true);
        
        toast({
          title: 'Workflow System Ready',
          description: 'Background processors are now running.',
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(errorMessage);
        
        toast({
          title: 'Workflow System Error',
          description: `Failed to start: ${errorMessage}`,
          variant: 'destructive',
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initializeWorkflow();

    // Cleanup on unmount
    return () => {
      WorkflowStartupService.shutdown();
    };
  }, [toast]);

  return {
    isInitialized,
    isInitializing,
    error
  };
};
