
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, AlertTriangle, CheckCircle, Clock, BarChart3 } from 'lucide-react';
import { useEnhancedCrawl } from '@/hooks/useEnhancedCrawl';

interface CrawlProgressTrackerProps {
  parentSourceId: string;
  onComplete?: () => void;
}

const CrawlProgressTracker: React.FC<CrawlProgressTrackerProps> = ({
  parentSourceId,
  onComplete
}) => {
  const { retryFailedJobs, getCrawlJobs, getActiveCrawlStatus } = useEnhancedCrawl();
  const [jobs, setJobs] = useState<any[]>([]);
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
      setJobs(jobsData || []);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(crawlStatus.status)}
            Crawl Progress
          </CardTitle>
          <Badge className={getStatusColor(crawlStatus.status)}>
            {crawlStatus.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Progress</span>
              <span>{crawlStatus.completedJobs + crawlStatus.failedJobs} / {crawlStatus.totalJobs}</span>
            </div>
            <Progress value={crawlStatus.progress} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{crawlStatus.completedJobs}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{crawlStatus.failedJobs}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">{crawlStatus.totalJobs - crawlStatus.completedJobs - crawlStatus.failedJobs}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </div>

          {crawlStatus.compressionStats && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-semibold text-blue-900 mb-2">Compression Stats</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-blue-700">Avg Compression:</span>
                  <span className="ml-1 font-medium">{(crawlStatus.compressionStats.avgCompressionRatio || 0).toFixed(2)}x</span>
                </div>
                <div>
                  <span className="text-blue-700">Unique Chunks:</span>
                  <span className="ml-1 font-medium">{crawlStatus.compressionStats.totalUniqueChunks}</span>
                </div>
                <div>
                  <span className="text-blue-700">Duplicates Found:</span>
                  <span className="ml-1 font-medium">{crawlStatus.compressionStats.totalDuplicateChunks}</span>
                </div>
                <div>
                  <span className="text-blue-700">Total Size:</span>
                  <span className="ml-1 font-medium">{Math.round(crawlStatus.compressionStats.totalContentSize / 1024)}KB</span>
                </div>
              </div>
            </div>
          )}

          {failedJobsCount > 0 && (
            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-3">
              <div>
                <span className="text-red-700 font-medium">{failedJobsCount} jobs failed</span>
                <p className="text-xs text-red-600">You can retry failed jobs or review individual failures</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetryFailed}
                className="border-red-200 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry Failed
              </Button>
            </div>
          )}

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
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Job Details</span>
                <Button variant="ghost" size="sm" onClick={loadJobs} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              <div className="max-h-48 overflow-y-auto space-y-1">
                {jobs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    <p className="text-sm">No job details available</p>
                    <Button variant="ghost" size="sm" onClick={loadJobs} className="mt-2">
                      Load Jobs
                    </Button>
                  </div>
                ) : (
                  jobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getStatusIcon(job.status)}
                        <span className="truncate">{job.url}</span>
                      </div>
                      <Badge variant="outline" className={`ml-2 ${getStatusColor(job.status)}`}>
                        {job.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
};

export default CrawlProgressTracker;
