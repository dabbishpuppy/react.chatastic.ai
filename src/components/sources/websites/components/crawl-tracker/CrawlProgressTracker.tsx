
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEnhancedCrawl } from '@/hooks/useEnhancedCrawl';
import CrawlProgressStats from './CrawlProgressStats';
import CrawlStatusBadge from './CrawlStatusBadge';
import FailedJobsPanel from './FailedJobsPanel';
import JobsList from './JobsList';
import CompressionStatsDisplay from './CompressionStatsDisplay';

interface CrawlProgressTrackerProps {
  parentSourceId: string;
  onClose?: () => void;
}

const CrawlProgressTracker: React.FC<CrawlProgressTrackerProps> = ({ 
  parentSourceId, 
  onClose 
}) => {
  const { getActiveCrawlStatus, retryFailedJobs, getCrawlJobs } = useEnhancedCrawl();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  
  const crawlStatus = getActiveCrawlStatus(parentSourceId);

  const handleRetryFailed = async () => {
    try {
      await retryFailedJobs(parentSourceId);
    } catch (error) {
      console.error('Error retrying failed jobs:', error);
    }
  };

  const handleLoadJobs = async () => {
    setLoadingJobs(true);
    try {
      const jobList = await getCrawlJobs(parentSourceId);
      setJobs(jobList);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    // Auto-load jobs when tracker is first shown
    if (parentSourceId) {
      handleLoadJobs();
    }
  }, [parentSourceId]);

  if (!crawlStatus) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Crawl Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No active crawl found for this source.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <span>Crawl Progress</span>
          <CrawlStatusBadge status={crawlStatus.status} />
        </CardTitle>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Statistics */}
        <CrawlProgressStats
          progress={crawlStatus.progress}
          completedJobs={crawlStatus.completedJobs}
          failedJobs={crawlStatus.failedJobs}
          totalJobs={crawlStatus.totalJobs}
        />

        {/* Failed Jobs Panel */}
        <FailedJobsPanel
          failedJobsCount={crawlStatus.failedJobs}
          onRetryFailed={handleRetryFailed}
        />

        {/* Compression Stats */}
        {crawlStatus.compressionStats && (
          <CompressionStatsDisplay
            compressionStats={crawlStatus.compressionStats}
          />
        )}

        {/* Jobs List */}
        <JobsList
          jobs={jobs}
          loading={loadingJobs}
          onLoadJobs={handleLoadJobs}
        />

        {/* Real-time status info */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <div>Parent Source ID: {parentSourceId}</div>
          <div>Last Updated: {new Date().toLocaleTimeString()}</div>
          {crawlStatus.status === 'completed' && (
            <div className="text-green-600 font-medium">
              ✅ Crawl completed successfully! 
              Space saved: {((1 - (crawlStatus.compressionStats?.avgCompressionRatio || 1)) * 100).toFixed(1)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CrawlProgressTracker;
