
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, CheckCircle, XCircle, Clock, Zap, Database } from 'lucide-react';
import { useEnhancedCrawl } from '@/hooks/useEnhancedCrawl';
import { CrawlStatus } from '@/services/rag/enhancedCrawlService';

interface CrawlProgressTrackerProps {
  parentSourceId: string;
  onComplete?: () => void;
}

const CrawlProgressTracker: React.FC<CrawlProgressTrackerProps> = ({ 
  parentSourceId, 
  onComplete 
}) => {
  const { getActiveCrawlStatus, retryFailedJobs, getCrawlJobs } = useEnhancedCrawl();
  const [crawlJobs, setCrawlJobs] = useState<any[]>([]);
  const [showJobs, setShowJobs] = useState(false);
  
  const status = getActiveCrawlStatus(parentSourceId);

  useEffect(() => {
    if (status?.status === 'completed') {
      onComplete?.();
    }
  }, [status?.status, onComplete]);

  const loadCrawlJobs = async () => {
    try {
      const jobs = await getCrawlJobs(parentSourceId);
      setCrawlJobs(jobs);
      setShowJobs(true);
    } catch (error) {
      console.error('Error loading crawl jobs:', error);
    }
  };

  const handleRetryFailed = async () => {
    try {
      await retryFailedJobs(parentSourceId);
    } catch (error) {
      console.error('Error retrying failed jobs:', error);
    }
  };

  if (!status) return null;

  const getStatusColor = (jobStatus: string) => {
    switch (jobStatus) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'in_progress': return 'text-blue-600';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (jobStatus: string) => {
    switch (jobStatus) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'in_progress': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Crawl Progress
          </div>
          <Badge variant={
            status.status === 'completed' ? 'default' : 
            status.status === 'failed' ? 'destructive' : 
            'secondary'
          }>
            {status.status.toUpperCase()}
          </Badge>
        </CardTitle>
        <CardDescription>
          Real-time progress tracking for enhanced website crawl
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{status.progress}%</span>
          </div>
          <Progress value={status.progress} className="w-full" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">{status.totalJobs}</div>
              <div className="text-xs text-muted-foreground">Total Pages</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">{status.completedJobs}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-red-600">{status.failedJobs}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-gray-600">
                {status.totalJobs - status.completedJobs - status.failedJobs}
              </div>
              <div className="text-xs text-muted-foreground">Remaining</div>
            </div>
          </div>
        </div>

        {/* Compression Stats */}
        {status.compressionStats && (
          <div className="border rounded-lg p-4 bg-green-50">
            <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Compression & Deduplication
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-lg font-bold text-green-700">
                  {formatBytes(status.compressionStats.totalContentSize)}
                </div>
                <div className="text-xs text-green-600">Original Size</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold text-green-700">
                  {status.compressionStats.avgCompressionRatio.toFixed(2)}x
                </div>
                <div className="text-xs text-green-600">Compression</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold text-green-700">
                  {status.compressionStats.totalUniqueChunks}
                </div>
                <div className="text-xs text-green-600">Unique Chunks</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold text-green-700">
                  {status.compressionStats.totalDuplicateChunks}
                </div>
                <div className="text-xs text-green-600">Deduplicated</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadCrawlJobs}
            disabled={!status.totalJobs}
          >
            {showJobs ? 'Refresh Jobs' : 'View Individual Jobs'}
          </Button>
          
          {status.failedJobs > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetryFailed}
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry Failed ({status.failedJobs})
            </Button>
          )}
        </div>

        {/* Individual Jobs List */}
        {showJobs && crawlJobs.length > 0 && (
          <div className="border rounded-lg">
            <div className="p-4 border-b bg-gray-50">
              <h4 className="font-semibold">Individual Page Jobs</h4>
            </div>
            <ScrollArea className="h-64">
              <div className="p-4 space-y-2">
                {crawlJobs.map((job) => (
                  <div 
                    key={job.id} 
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getStatusIcon(job.status)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{job.url}</div>
                        {job.error_message && (
                          <div className="text-xs text-red-600 truncate">{job.error_message}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {job.chunks_created > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {job.chunks_created} chunks
                        </Badge>
                      )}
                      {job.processing_time_ms > 0 && (
                        <span>{(job.processing_time_ms / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CrawlProgressTracker;
