
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Globe, BarChart3 } from 'lucide-react';
import EnhancedWebsiteCrawlForm from './components/EnhancedWebsiteCrawlForm';
import CrawlProgressTracker from './components/CrawlProgressTracker';
import { useEnhancedCrawl } from '@/hooks/useEnhancedCrawl';
import { useOptimizedAgentSources } from '@/hooks/useOptimizedAgentSources';

const EnhancedWebsiteTab: React.FC = () => {
  const { activeCrawls } = useEnhancedCrawl();
  const { sources, refetch } = useOptimizedAgentSources();
  const [activeTab, setActiveTab] = useState('crawl');

  const websiteSources = sources.filter(source => source.source_type === 'website');
  const activeCrawlSources = websiteSources.filter(source => 
    activeCrawls.some(crawl => crawl.parentSourceId === source.id)
  );

  const handleCrawlSuccess = () => {
    refetch();
    setActiveTab('progress');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Zap className="h-6 w-6 text-blue-500" />
        <h2 className="text-2xl font-bold">Enhanced Website Crawling</h2>
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          v2.0 Beta
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="crawl" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            New Crawl
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Active Crawls
            {activeCrawls.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeCrawls.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sources">
            Sources ({websiteSources.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="crawl" className="space-y-4">
          <EnhancedWebsiteCrawlForm onSuccess={handleCrawlSuccess} />
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          {activeCrawls.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                  <p>No active crawls</p>
                  <p className="text-sm">Start a new crawl to see progress here</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            activeCrawls.map((crawl) => (
              <CrawlProgressTracker
                key={crawl.parentSourceId}
                parentSourceId={crawl.parentSourceId}
                onComplete={refetch}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          {websiteSources.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-muted-foreground">
                  <Globe className="h-8 w-8 mx-auto mb-2" />
                  <p>No website sources</p>
                  <p className="text-sm">Crawl your first website to get started</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {websiteSources.map((source) => {
                // Type assertion for new fields until Supabase types are regenerated
                const enhancedSource = source as any;
                
                return (
                  <Card key={source.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{source.title}</h3>
                          <p className="text-sm text-muted-foreground">{source.url}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={
                              source.crawl_status === 'completed' ? 'default' :
                              source.crawl_status === 'failed' ? 'destructive' :
                              'secondary'
                            }>
                              {source.crawl_status}
                            </Badge>
                            {source.progress !== null && (
                              <span className="text-sm text-muted-foreground">
                                {source.progress}% complete
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {source.links_count && (
                            <div className="text-sm">
                              <span className="font-medium">{source.links_count}</span> pages
                            </div>
                          )}
                          {enhancedSource.compressed_content_size && enhancedSource.total_content_size && (
                            <div className="text-xs text-muted-foreground">
                              {((enhancedSource.total_content_size - enhancedSource.compressed_content_size) / enhancedSource.total_content_size * 100).toFixed(1)}% saved
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedWebsiteTab;
