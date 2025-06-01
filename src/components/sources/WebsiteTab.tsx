
import React, { useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { useWebsiteSourceOperations } from "./websites/hooks/useWebsiteSourceOperations";
import { EnhancedWebsiteCrawlFormV2 } from "./websites/components/EnhancedWebsiteCrawlFormV2";
import WebsiteSourcesListOptimized from "./websites/components/WebsiteSourcesListOptimized";
import ErrorBoundary from "./ErrorBoundary";
import { useSourcesPaginated } from "@/hooks/useSourcesPaginated";
import CrawlProgressTracker from "./websites/components/crawl-tracker/CrawlProgressTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

const WebsiteTabContent: React.FC = () => {
  const [trackingCrawlId, setTrackingCrawlId] = useState<string | null>(null);

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

  const handleCrawlStarted = (parentSourceId: string) => {
    // Show the progress tracker for the new crawl
    setTrackingCrawlId(parentSourceId);
    refetch();
    
    toast({
      title: "Enhanced Crawl Started",
      description: "Your crawl has been initiated with the new parent-child workflow",
    });
  };

  return (
    <div className="space-y-6 mt-4">
      <div>
        <h2 className="text-2xl font-semibold">Enhanced Website Training</h2>
        <p className="text-muted-foreground mt-1">
          Industrial-scale crawling with compression and global deduplication
        </p>
      </div>

      <div className="space-y-6">
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
