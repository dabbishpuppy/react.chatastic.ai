
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EnhancedWebsiteCrawlForm from './components/EnhancedWebsiteCrawlForm';
import CrawlProgressTracker from './components/crawl-tracker/CrawlProgressTracker';
import WebsiteSourcesList from './components/WebsiteSourcesList';
import { useEnhancedCrawl } from '@/hooks/useEnhancedCrawl';
import { useWebsiteSourceOperations } from './hooks/useWebsiteSourceOperations';
import { useSourcesPaginated } from '@/hooks/useSourcesPaginated';

const EnhancedWebsiteTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState('new-crawl');
  const [trackingCrawlId, setTrackingCrawlId] = useState<string | null>(null);
  const { activeCrawls } = useEnhancedCrawl();

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

  const handleCrawlInitiated = () => {
    // Switch to active crawls tab after initiating a crawl
    setActiveTab('active-crawls');
  };

  const handleTrackCrawl = (crawlId: string) => {
    setTrackingCrawlId(crawlId);
    setActiveTab('active-crawls');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Website Crawler</h2>
          <p className="text-muted-foreground">
            Industrial-scale crawling with compression and global deduplication
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="new-crawl">New Crawl</TabsTrigger>
          <TabsTrigger value="active-crawls" className="relative">
            Active Crawls
            {activeCrawls.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                {activeCrawls.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sources">All Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="new-crawl" className="mt-6">
          <EnhancedWebsiteCrawlForm onCrawlInitiated={handleCrawlInitiated} />
        </TabsContent>

        <TabsContent value="active-crawls" className="mt-6">
          <div className="space-y-4">
            {activeCrawls.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Active Crawls</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    No crawls are currently running. Start a new crawl to see progress here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {trackingCrawlId ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setTrackingCrawlId(null)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        ← Back to all active crawls
                      </button>
                    </div>
                    <CrawlProgressTracker 
                      parentSourceId={trackingCrawlId}
                      onClose={() => setTrackingCrawlId(null)}
                    />
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {activeCrawls.map((crawl) => (
                      <Card key={crawl.parentSourceId} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Crawl Progress</div>
                              <div className="text-sm text-muted-foreground">
                                {crawl.completedJobs + crawl.failedJobs} / {crawl.totalJobs} pages
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Status: {crawl.status} • Progress: {crawl.progress}%
                              </div>
                            </div>
                            <button
                              onClick={() => handleTrackCrawl(crawl.parentSourceId)}
                              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                              View Details
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sources" className="mt-6">
          <WebsiteSourcesList
            onEdit={handleEdit}
            onExclude={handleExclude}
            onDelete={handleDelete}
            onRecrawl={handleRecrawl}
            loading={false}
            error={null}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedWebsiteTab;
