
import React, { useEffect, useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { useSourcesPaginated } from "@/hooks/useSourcesPaginated";
import { useWebsiteSourceOperations } from "../hooks/useWebsiteSourceOperations";
import { ProductionWorkerQueue } from "@/services/rag/enhanced/productionWorkerQueue";
import EnhancedWebsiteCrawlFormV3 from "../components/EnhancedWebsiteCrawlFormV3";
import WebsiteSourcesListOptimized from "../components/WebsiteSourcesListOptimized";
import QueueStatusDashboard from "../components/QueueStatusDashboard";

const WebsiteTabContainer: React.FC = () => {
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

  const handleCrawlStarted = useCallback((parentSourceId: string) => {
    refetch();
    
    toast({
      title: "Enhanced Crawl Started",
      description: "Your crawl has been initiated with production worker queue and rate limiting",
    });
  }, [refetch]);

  return (
    <div className="space-y-6 mt-4">
      <div>
        <h2 className="text-2xl font-semibold">Enhanced Website Training</h2>
        <p className="text-muted-foreground mt-1">
          Production-scale crawling with multiple modes, worker queue, rate limiting, and compression
        </p>
      </div>

      <div className="space-y-6">
        {/* Queue Status Dashboard */}
        <QueueStatusDashboard 
          healthStatus={healthStatus}
          queueMetrics={queueMetrics}
        />

        {/* Enhanced Crawl Form V3 */}
        <EnhancedWebsiteCrawlFormV3 onCrawlStarted={handleCrawlStarted} />

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

export default WebsiteTabContainer;
