
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useDistributedCrawl } from './useDistributedCrawl';
import type { EnhancedCrawlRequest } from '@/services/rag/enhanced/crawlTypes';

export const useCrawlInitiation = () => {
  const [loading, setLoading] = useState(false);
  const distributedCrawl = useDistributedCrawl();

  const initiateCrawl = async (request: EnhancedCrawlRequest) => {
    setLoading(true);
    
    try {
      console.log('🚀 Initiating enhanced crawl with distributed system:', request);
      
      // Convert to distributed crawl format with proper type casting
      const distributedRequest = {
        parentSourceId: request.agentId,
        agentId: request.agentId,
        url: request.url,
        crawlConfig: {
          maxPages: request.maxPages || 100,
          maxDepth: request.maxDepth || 3,
          excludePaths: request.excludePaths || [],
          includePaths: request.includePaths || [],
          respectRobots: request.respectRobots !== false
        },
        priority: (request.priority === 'high' ? 'high' : 'normal') as 'low' | 'normal' | 'high'
      };

      // Use the new distributed crawl system
      const sessionId = await distributedCrawl.initiateCrawl(distributedRequest);
      
      console.log('✅ Distributed crawl initiated with session ID:', sessionId);
      
      return {
        parentSourceId: sessionId,
        sessionId
      };
      
    } catch (error) {
      console.error('❌ Distributed crawl initiation failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    initiateCrawl,
    loading,
    isLoading: loading,
    
    // Expose distributed crawl state for advanced usage
    distributedState: distributedCrawl.state,
    getSessionStatus: distributedCrawl.getSessionStatus,
    getWorkerStatus: distributedCrawl.getWorkerStatus,
    getProgressHistory: distributedCrawl.getProgressHistory
  };
};
