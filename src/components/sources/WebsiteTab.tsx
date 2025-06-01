
import React, { useCallback, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useWebsiteSourceOperations } from "./websites/hooks/useWebsiteSourceOperations";
import { EnhancedWebsiteCrawlFormV2 } from "./websites/components/EnhancedWebsiteCrawlFormV2";
import WebsiteSourcesListOptimized from "./websites/components/WebsiteSourcesListOptimized";
import ErrorBoundary from "./ErrorBoundary";
import { useSourcesPaginated } from "@/hooks/useSourcesPaginated";
import CrawlProgressTracker from "./websites/components/crawl-tracker/CrawlProgressTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { ProductionWorkerQueue } from "@/services/rag/enhanced/productionWorkerQueue";
import { ProductionRateLimiting } from "@/services/rag/enhanced/productionRateLimiting";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, Activity } from "lucide-react";

const WebsiteTabContent: React.FC = () => {
  const [trackingCrawlId, setTrackingCrawlId] = useState<string | null>(null);
  const [queueMetrics, setQueueMetrics] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  const { refetch } = useSourcesPaginated({
    sourceType: 'website',
    page: 1,
    pageSize: 25
  });

  const { handleEdit, handleExclude, handleDelete, handleRecrawl } = useWebsiteSourceOperations(
    refetch, 
    (sourceId: string) => {
      refetch();
    }
  );

  // Initialize production queue on component mount
  useEffect(() => {
    const initializeQueue = async () => {
      try {
        await ProductionWorkerQueue.startQueueProcessor();
        console.log('✅ Production worker queue initialized');
      } catch (error) {
        console.error('❌ Failed to initialize worker queue:', error);
      }
    };

    initializeQueue();

    // Set up metrics polling
    const metricsInterval = setInterval(async () => {
      try {
        const [metrics, health] = await Promise.all([
          ProductionWorkerQueue.getQueueMetrics(),
          ProductionWorkerQueue.getHealthStatus()
        ]);
        setQueueMetrics(metrics);
        setHealthStatus(health);
      } catch (error) {
        console.error('Error fetching queue metrics:', error);
      }
    }, 10000); // Update every 10 seconds

    return () => {
      clearInterval(metricsInterval);
      ProductionWorkerQueue.stopQueueProcessor();
    };
  }, []);

  const handleCrawlStarted = (parentSourceId: string) => {
    // Show the progress tracker for the new crawl
    setTrackingCrawlId(parentSourceId);
    refetch();
    
    toast({
      title: "Enhanced Crawl Started",
      description: "Your crawl has been initiated with production worker queue and rate limiting",
    });
  };

  const renderQueueStatus = () => {
    if (!healthStatus || !queueMetrics) return null;

    const getHealthIcon = () => {
      if (healthStatus.healthy) {
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      }
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    };

    const getHealthColor = () => {
      if (healthStatus.healthy) return "bg-green-50 text-green-700 border-green-200";
      return "bg-red-50 text-red-700 border-red-200";
    };

    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="w-4 h-4" />
            Production Queue Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              {getHealthIcon()}
              <div>
                <div className="text-sm font-medium">System Health</div>
                <Badge variant="outline" className={getHealthColor()}>
                  {healthStatus.healthy ? 'Healthy' : 'Degraded'}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-sm font-medium">Queue Depth</div>
                <div className="text-lg font-semibold">{healthStatus.queueDepth}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-sm font-medium">Active Workers</div>
                <div className="text-lg font-semibold">{healthStatus.activeWorkers}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-purple-500" />
              <div>
                <div className="text-sm font-medium">Success Rate</div>
                <div className="text-lg font-semibold">
                  {((1 - healthStatus.errorRate) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
          
          {queueMetrics && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Pending:</span>
                  <span className="ml-1 font-medium">{queueMetrics.totalPending}</span>
                </div>
                <div>
                  <span className="text-gray-500">Processing:</span>
                  <span className="ml-1 font-medium">{queueMetrics.totalInProgress}</span>
                </div>
                <div>
                  <span className="text-gray-500">Completed:</span>
                  <span className="ml-1 font-medium text-green-600">{queueMetrics.totalCompleted}</span>
                </div>
                <div>
                  <span className="text-gray-500">Failed:</span>
                  <span className="ml-1 font-medium text-red-600">{queueMetrics.totalFailed}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 mt-4">
      <div>
        <h2 className="text-2xl font-semibold">Enhanced Website Training</h2>
        <p className="text-muted-foreground mt-1">
          Production-scale crawling with worker queue, rate limiting, and compression
        </p>
      </div>

      <div className="space-y-6">
        {/* Queue Status Dashboard */}
        {renderQueueStatus()}

        {/* Enhanced Crawl Form */}
        <EnhancedWebsiteCrawlFormV2 onCrawlStarted={handleCrawlStarted} />

        {/* Progress Tracker */}
        {trackingCrawlId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Active Crawl Progress
                <button 
                  onClick={() => setTrackingCrawlId(null)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Hide
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CrawlProgressTracker 
                parentSourceId={trackingCrawlId}
                onClose={() => setTrackingCrawlId(null)}
              />
            </CardContent>
          </Card>
        )}

        {/* Sources List */}
        <WebsiteSourcesListOptimized
          onEdit={handleEdit}
          onExclude={handleExclude}
          onDelete={handleDelete}
          onRecrawl={handleRecrawl}
          loading={false}
          error={null}
        />
      </div>
    </div>
  );
};

const WebsiteTab: React.FC = () => {
  return (
    <ErrorBoundary tabName="Website">
      <WebsiteTabContent />
    </ErrorBoundary>
  );
};

export default WebsiteTab;
