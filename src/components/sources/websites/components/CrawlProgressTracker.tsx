
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3 } from 'lucide-react';
import { useEnhancedCrawl } from '@/hooks/useEnhancedCrawl';
import CrawlStatusBadge from './crawl-tracker/CrawlStatusBadge';
import CrawlProgressStats from './crawl-tracker/CrawlProgressStats';
import CompressionStatsDisplay from './crawl-tracker/CompressionStatsDisplay';
import FailedJobsPanel from './crawl-tracker/FailedJobsPanel';
import JobsList from './crawl-tracker/JobsList';

interface CrawlProgressTrackerProps {
  parentSourceId: string;
  onComplete?: () => void;
}

interface CrawlJob {
  id: string;
  url: string;
  status: string;
  error_message?: string;
}

const CrawlProgressTracker: React.FC<CrawlProgressTrackerProps> = ({
  parentSourceId,
  onComplete
}) => {
  const { retryFailedJobs, getCrawlJobs, getActiveCrawlStatus } = useEnhancedCrawl();
  const [jobs, setJobs] = useState<CrawlJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const crawlStatus = getActiveCrawlStatus(parentSourceId);

  useEffect(() => {
    if (crawlStatus?.status === 'completed' && onComplete) {
      onComplete();
    }
  }, [crawlStatus?.status, onComplete]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const jobsData = await getCrawlJobs(parentSourceId);
      setJobs(Array.isArray(jobsData) ? jobsData : []);
    } catch (error) {
      console.error('Failed to load jobs:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryFailed = async () => {
    try {
      const retriedCount = await retryFailedJobs(parentSourceId);
      if (retriedCount > 0) {
        await loadJobs();
      }
    } catch (error) {
      console.error('Failed to retry jobs:', error);
    }
  };

  if (!crawlStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2" />
            <p>Crawl status not found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const failedJobsCount = jobs.filter(job => job.status === 'failed').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Crawl Progress</CardTitle>
          <CrawlStatusBadge status={crawlStatus.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <CrawlProgressStats
            progress={crawlStatus.progress}
            completedJobs={crawlStatus.completedJobs}
            failedJobs={crawlStatus.failedJobs}
            totalJobs={crawlStatus.totalJobs}
          />

          {crawlStatus.compressionStats && (
            <CompressionStatsDisplay compressionStats={crawlStatus.compressionStats} />
          )}

          <FailedJobsPanel 
            failedJobsCount={failedJobsCount}
            onRetryFailed={handleRetryFailed}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="jobs">
                Jobs ({jobs.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Source ID: <code className="bg-gray-100 px-1 rounded text-xs">{parentSourceId}</code>
              </div>
            </TabsContent>

            <TabsContent value="jobs" className="space-y-2">
              <JobsList
                jobs={jobs}
                loading={loading}
                onLoadJobs={loadJobs}
              />
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
};

export default CrawlProgressTracker;
