
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { ImprovedCrawlApiService as CrawlApiService } from '@/services/rag/enhanced/improvedCrawlApi';
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

      // Start automatic source page processing every 5 seconds
      const processingInterval = setInterval(async () => {
        try {
          await EnhancedCrawlService.startSourcePageProcessing();
          console.log('🔄 Automatic source page processing triggered');
        } catch (error) {
          console.warn('⚠️ Automatic processing warning (may be normal):', error);
        }
      }, 5000);

      // Start monitoring crawl completion after 5 seconds
      setTimeout(() => {
        monitorCrawlCompletion(result.parentSourceId, request.agentId, processingInterval);
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

  const monitorCrawlCompletion = async (parentSourceId: string, agentId: string, processingInterval: NodeJS.Timeout) => {
    let checkCount = 0;
    const maxChecks = 60; // 5 minutes of monitoring
    
    const checkCompletion = async () => {
      try {
        checkCount++;
        
        // Enhanced validation before status check
        if (!parentSourceId || parentSourceId === 'undefined' || parentSourceId === 'null') {
          console.error('Invalid parentSourceId in monitoring:', parentSourceId);
          clearInterval(processingInterval);
          return;
        }
        
        const status = await CrawlApiService.checkCrawlStatus(parentSourceId);
        
        // If status check indicates the source doesn't exist, stop monitoring
        if (status.status === 'failed' && status.totalJobs === 0 && status.completedJobs === 0) {
          console.error('Source appears to be deleted or invalid, stopping monitoring');
          clearInterval(processingInterval);
          window.dispatchEvent(new CustomEvent('crawlCompleted', {
            detail: { agentId, parentSourceId, status: 'failed', error: true }
          }));
          return;
        }
        
        if (status.status === 'completed') {
          console.log('🎉 Crawl completed successfully');
          
          // Clear the processing interval
          clearInterval(processingInterval);
          
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
          
          // Clear the processing interval
          clearInterval(processingInterval);
          
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
          console.log('⏰ Crawl monitoring timeout - clearing processing interval');
          
          // Clear the processing interval on timeout
          clearInterval(processingInterval);
          
          // Trigger recovery check after timeout
          try {
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
          } catch (error) {
            console.warn('Recovery check failed after timeout:', error);
          }
        }
      } catch (error) {
        console.error('Error checking crawl status:', error);
        // Stop monitoring on error but don't spam the user with error messages
        // They'll see the original error from the status check
        clearInterval(processingInterval);
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
