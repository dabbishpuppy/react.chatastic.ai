
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CrawlOrchestrator, CrawlInitiationRequest } from '@/services/crawl/distributed/CrawlOrchestrator';
import { CrawlWorker } from '@/services/crawl/distributed/CrawlWorker';
import { CrawlProgressPublisher, ProgressEvent } from '@/services/crawl/distributed/CrawlProgressPublisher';

export interface DistributedCrawlState {
  isLoading: boolean;
  sessionId: string | null;
  progress: number;
  status: 'idle' | 'discovering' | 'crawling' | 'completed' | 'failed';
  message: string;
  totalPages: number;
  processedPages: number;
  failedPages: number;
  estimatedCompletion?: string;
}

export const useDistributedCrawl = () => {
  const { toast } = useToast();
  const [state, setState] = useState<DistributedCrawlState>({
    isLoading: false,
    sessionId: null,
    progress: 0,
    status: 'idle',
    message: '',
    totalPages: 0,
    processedPages: 0,
    failedPages: 0
  });

  /**
   * Initialize the distributed crawl system
   */
  useEffect(() => {
    // Start the crawl worker when component mounts
    CrawlWorker.startWorker();

    // Listen for progress events
    const handleProgress = (event: CustomEvent<any>) => {
      const progressData: ProgressEvent = event.detail;
      
      setState(prev => ({
        ...prev,
        progress: progressData.progress,
        status: progressData.status === 'processing' ? 'crawling' : 
                progressData.status === 'pending' ? 'discovering' : 
                progressData.status as 'idle' | 'discovering' | 'crawling' | 'completed' | 'failed',
        message: progressData.message,
        totalPages: progressData.metadata?.totalPages || prev.totalPages,
        processedPages: progressData.metadata?.completedPages || prev.processedPages,
        failedPages: progressData.metadata?.failedPages || prev.failedPages,
        estimatedCompletion: progressData.metadata?.estimatedCompletion
      }));
    };

    window.addEventListener('crawlProgress', handleProgress as EventListener);

    return () => {
      // Cleanup
      window.removeEventListener('crawlProgress', handleProgress as EventListener);
      CrawlWorker.stopWorker();
    };
  }, []);

  /**
   * Initiate a distributed crawl
   */
  const initiateCrawl = async (request: CrawlInitiationRequest) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      status: 'discovering',
      progress: 0,
      message: 'Initiating crawl...',
      sessionId: null
    }));

    try {
      console.log('🚀 Initiating distributed crawl:', request);

      // Dispatch crawl started event
      window.dispatchEvent(new CustomEvent('crawlStarted', {
        detail: { agentId: request.agentId, url: request.url }
      }));

      // Start the crawl via orchestrator
      const sessionId = await CrawlOrchestrator.initiateCrawl(request);

      setState(prev => ({
        ...prev,
        sessionId,
        status: 'discovering',
        message: 'Crawl initiated successfully'
      }));

      toast({
        title: "Distributed Crawl Started",
        description: `Crawling ${request.url} using distributed worker system`,
        duration: 3000,
      });

      return sessionId;

    } catch (error) {
      console.error('❌ Distributed crawl initiation failed:', error);

      setState(prev => ({
        ...prev,
        isLoading: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Failed to start crawl'
      }));

      // Dispatch crawl completed event with error
      window.dispatchEvent(new CustomEvent('crawlCompleted', {
        detail: { 
          agentId: request.agentId, 
          error: true,
          sessionId: state.sessionId 
        }
      }));

      toast({
        title: "Crawl Failed",
        description: error instanceof Error ? error.message : "Failed to start crawl",
        variant: "destructive",
      });

      throw error;

    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  /**
   * Get current session status
   */
  const getSessionStatus = async (sessionId: string) => {
    try {
      const status = await CrawlOrchestrator.getSessionStatus(sessionId);
      return status;
    } catch (error) {
      console.error('❌ Failed to get session status:', error);
      return null;
    }
  };

  /**
   * Get worker status and metrics
   */
  const getWorkerStatus = () => {
    return CrawlWorker.getStatus();
  };

  /**
   * Get progress history for a source
   */
  const getProgressHistory = async (sourceId: string) => {
    try {
      return await CrawlProgressPublisher.getProgressHistory(sourceId);
    } catch (error) {
      console.error('❌ Failed to get progress history:', error);
      return [];
    }
  };

  return {
    state,
    initiateCrawl,
    getSessionStatus,
    getWorkerStatus,
    getProgressHistory,
    
    // Backward compatibility
    loading: state.isLoading,
    isLoading: state.isLoading,
    progress: state.progress,
    status: state.status,
    message: state.message
  };
};
