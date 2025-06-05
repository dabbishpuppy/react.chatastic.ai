
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { CrawlApiService } from '@/services/rag/enhanced/crawlApi';
import { EnhancedCrawlService } from '@/services/rag/enhanced/enhancedCrawlService';
import { CrawlRecoveryService } from '@/services/rag/crawlRecoveryService';
import type { EnhancedCrawlRequest } from '@/services/rag/enhanced/crawlTypes';

export const useCrawlInitiation = () => {
  const [loading, setLoading] = useState(false);

  const initiateCrawl = async (request: EnhancedCrawlRequest) => {
    setLoading(true);
    
    try {
      console.log('🚀 Initiating enhanced crawl with request:', request);
      
      // Dispatch crawl started event to suppress connection warnings
      window.dispatchEvent(new CustomEvent('crawlStarted', {
        detail: { agentId: request.agentId, url: request.url }
      }));
      
      const result = await CrawlApiService.initiateCrawl(request);
      
      console.log('✅ Enhanced crawl initiated successfully:', result);
      
      // Show crawl started toast (Phase 1)
      toast({
        title: "Crawling Started Successfully",
        description: `Discovering and crawling ${request.url}...`,
        duration: 3000,
      });
      
      // Start source page processing after a brief delay
      setTimeout(async () => {
        try {
          const processingResult = await EnhancedCrawlService.startSourcePageProcessing();
          console.log('🔄 Source page processing started:', processingResult);
        } catch (error) {
          console.warn('⚠️ Source page processing warning (may be normal):', error);
        }
      }, 2000);
      
      // Monitor crawl completion and show completion toast (Phase 2)
      setTimeout(() => {
        monitorCrawlCompletion(result.parentSourceId, request.agentId);
      }, 5000);
      
      return result;
      
    } catch (error) {
      console.error('❌ Enhanced crawl initiation failed:', error);
      
      // Dispatch crawl completed event even on failure to clear flags
      window.dispatchEvent(new CustomEvent('crawlCompleted', {
        detail: { agentId: request.agentId, error: true }
      }));
      
      // Show crawl failed toast
      toast({
        title: "Crawling Failed",
        description: error instanceof Error ? error.message : "Failed to start crawl",
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const monitorCrawlCompletion = async (parentSourceId: string, agentId: string) => {
    let checkCount = 0;
    const maxChecks = 60; // 5 minutes of monitoring
    
    const checkCompletion = async () => {
      try {
        checkCount++;
        
        const status = await CrawlApiService.checkCrawlStatus(parentSourceId);
        
        if (status.status === 'completed') {
          console.log('🎉 Crawl completed successfully');
          
          // Check if recovery is needed before showing success
          const recoveryStatus = await CrawlRecoveryService.getRecoveryStatus(parentSourceId);
          
          if (recoveryStatus.needsRecovery) {
            console.log('🔄 Auto-triggering recovery for incomplete pages');
            
            // Auto-trigger recovery
            setTimeout(async () => {
              try {
                const recoveryResult = await CrawlRecoveryService.autoRetryFailedPages(parentSourceId);
                if (recoveryResult.success && recoveryResult.retriedCount! > 0) {
                  toast({
                    title: "Auto-Recovery Triggered",
                    description: `Retrying ${recoveryResult.retriedCount} incomplete pages`,
                    duration: 4000,
                  });
                }
              } catch (recoveryError) {
                console.warn('⚠️ Auto-recovery failed:', recoveryError);
              }
            }, 2000);
          }
          
          // Show crawl completed toast (Phase 2)
          toast({
            title: "Crawling Completed Successfully",
            description: `Successfully crawled ${status.completedJobs} pages${recoveryStatus.needsRecovery ? ' (auto-retry initiated for incomplete pages)' : ''}`,
            duration: 4000,
          });
          
          // Dispatch crawl completed event
          window.dispatchEvent(new CustomEvent('crawlCompleted', {
            detail: { agentId, parentSourceId, status: 'completed' }
          }));
          
          return;
        } else if (status.status === 'failed') {
          console.log('❌ Crawl failed');
          
          // Show crawl failed toast
          toast({
            title: "Crawling Failed",
            description: `Crawl failed after processing ${status.completedJobs} pages`,
            variant: "destructive",
          });
          
          // Dispatch crawl completed event with error
          window.dispatchEvent(new CustomEvent('crawlCompleted', {
            detail: { agentId, parentSourceId, status: 'failed', error: true }
          }));
          
          return;
        }
        
        // Continue monitoring if still in progress and under max checks
        if ((status.status === 'in_progress' || status.status === 'pending') && checkCount < maxChecks) {
          setTimeout(checkCompletion, 5000); // Check every 5 seconds
        } else if (checkCount >= maxChecks) {
          console.log('⏰ Crawl monitoring timeout - triggering recovery check');
          
          // Trigger recovery check after timeout
          const recoveryStatus = await CrawlRecoveryService.getRecoveryStatus(parentSourceId);
          if (recoveryStatus.needsRecovery) {
            toast({
              title: "Crawl Taking Longer Than Expected",
              description: "Auto-recovery will be triggered to complete remaining pages",
              duration: 5000,
            });
            
            setTimeout(async () => {
              await CrawlRecoveryService.autoRetryFailedPages(parentSourceId);
            }, 3000);
          }
        }
      } catch (error) {
        console.error('Error checking crawl status:', error);
        // Stop monitoring on error
      }
    };
    
    checkCompletion();
  };

  return {
    initiateCrawl,
    loading,
    isLoading: loading
  };
};
