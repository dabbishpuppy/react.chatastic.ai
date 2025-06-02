
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useParams } from 'react-router-dom';
import { useEnhancedCrawl } from '@/hooks/useEnhancedCrawl';
import { useProductionInfrastructure } from '@/hooks/useProductionInfrastructure';

interface EnhancedWebsiteCrawlFormV3Props {
  onCrawlStarted?: (parentSourceId: string) => void;
}

const EnhancedWebsiteCrawlFormV3: React.FC<EnhancedWebsiteCrawlFormV3Props> = ({
  onCrawlStarted
}) => {
  const { agentId } = useParams();
  const [activeTab, setActiveTab] = useState('website');
  const [url, setUrl] = useState('');
  const [protocol, setProtocol] = useState('https://');
  const [crawlMode, setCrawlMode] = useState<'single' | 'sitemap' | 'discovery'>('discovery');
  const [maxPages, setMaxPages] = useState(50);
  const [maxDepth, setMaxDepth] = useState(3);
  const [respectRobots, setRespectRobots] = useState(true);
  const [includePaths, setIncludePaths] = useState('');
  const [excludePaths, setExcludePaths] = useState('');
  const [loading, setLoading] = useState(false);

  const { initiateCrawl } = useEnhancedCrawl();
  const { 
    infrastructureHealth, 
    systemHealth, 
    loading: infrastructureLoading,
    loadInfrastructureHealth 
  } = useProductionInfrastructure();

  // Initialize infrastructure on mount
  useEffect(() => {
    loadInfrastructureHealth();
  }, [loadInfrastructureHealth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId || !url.trim()) return;

    setLoading(true);
    try {
      const fullUrl = url.startsWith('http') ? url : `${protocol}${url.trim()}`;
      
      console.log('🚀 Starting enhanced crawl with V3 form:', {
        url: fullUrl,
        crawlMode,
        maxPages,
        maxDepth,
        respectRobots,
        includePaths,
        excludePaths,
        agentId,
        activeTab
      });

      // Convert tab and crawl mode to the expected format
      let finalCrawlMode: 'single-page' | 'sitemap-only' | 'full-website' = 'full-website';
      
      if (activeTab === 'single-site') {
        finalCrawlMode = 'single-page';
      } else if (activeTab === 'sitemap') {
        finalCrawlMode = 'sitemap-only';
      } else if (crawlMode === 'single') {
        finalCrawlMode = 'single-page';
      } else if (crawlMode === 'sitemap') {
        finalCrawlMode = 'sitemap-only';
      }

      // Parse include/exclude paths
      const includePathsArray = includePaths.split(',').map(p => p.trim()).filter(p => p.length > 0);
      const excludePathsArray = excludePaths.split(',').map(p => p.trim()).filter(p => p.length > 0);

      const result = await initiateCrawl({
        url: fullUrl,
        agentId,
        crawlMode: finalCrawlMode,
        maxPages,
        respectRobots,
        includePaths: includePathsArray,
        excludePaths: excludePathsArray
      });

      if (result.parentSourceId) {
        toast({
          title: "Enhanced Crawl Started Successfully",
          description: `Your ${activeTab} crawl has been initiated with production infrastructure. Monitoring ${result.parentSourceId}`,
        });

        onCrawlStarted?.(result.parentSourceId);
        setUrl('');
        setIncludePaths('');
        setExcludePaths('');
      } else {
        throw new Error('Failed to start crawl');
      }
    } catch (error: any) {
      console.error('❌ Enhanced crawl submission failed:', error);
      toast({
        title: "Crawl Failed",
        description: error.message || "Failed to start the enhanced crawl",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInfrastructureStatus = () => {
    if (!infrastructureHealth) return '🔄 Initializing...';
    
    const isHealthy = infrastructureHealth.overall?.status === 'healthy';
    return isHealthy ? '✅ Operational' : '⚠️ Degraded';
  };

  const getQueueInfo = () => {
    if (!infrastructureHealth?.connectionPools) return 'Queue: Loading...';
    return `Queue: ${infrastructureHealth.connectionPools.queuedRequests || 0} queued, ${infrastructureHealth.connectionPools.activeConnections || 0} active`;
  };

  const getTabDescription = () => {
    switch (activeTab) {
      case 'website':
        return 'Crawl an entire website with smart discovery and filtering options.';
      case 'single-site':
        return 'Add content from a single specific page without crawling linked pages.';
      case 'sitemap':
        return 'Use the website\'s sitemap.xml to discover and crawl all pages efficiently.';
      default:
        return '';
    }
  };

  const getButtonText = () => {
    switch (activeTab) {
      case 'website':
        return loading ? "Starting Website Crawl..." : "Start Website Crawl";
      case 'single-site':
        return loading ? "Adding Page..." : "Add Single Page";
      case 'sitemap':
        return loading ? "Starting Sitemap Crawl..." : "Start Sitemap Crawl";
      default:
        return loading ? "Processing..." : "Start Crawl";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Enhanced Website Crawl V3
          <div className="text-sm font-normal text-gray-600">
            Infrastructure: {getInfrastructureStatus()} | {getQueueInfo()}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="website">Website</TabsTrigger>
            <TabsTrigger value="single-site">Single Site</TabsTrigger>
            <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
          </TabsList>

          <div className="mt-4 mb-6">
            <p className="text-sm text-gray-600">{getTabDescription()}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* URL Input - Common across all tabs */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <div className="md:col-span-2">
                <Select value={protocol} onValueChange={setProtocol}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="https://">https://</SelectItem>
                    <SelectItem value="http://">http://</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-10">
                <Input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="example.com or example.com/page"
                  required
                />
              </div>
            </div>

            <TabsContent value="website" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Crawl Mode */}
                <div>
                  <Label htmlFor="crawlMode">Crawl Mode</Label>
                  <Select value={crawlMode} onValueChange={(value: 'single' | 'sitemap' | 'discovery') => setCrawlMode(value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Page</SelectItem>
                      <SelectItem value="sitemap">Sitemap Discovery</SelectItem>
                      <SelectItem value="discovery">Smart Discovery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Max Pages */}
                {crawlMode !== 'single' && (
                  <div>
                    <Label htmlFor="maxPages">Max Pages</Label>
                    <Select value={maxPages.toString()} onValueChange={(value) => setMaxPages(parseInt(value))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 pages</SelectItem>
                        <SelectItem value="25">25 pages</SelectItem>
                        <SelectItem value="50">50 pages</SelectItem>
                        <SelectItem value="100">100 pages</SelectItem>
                        <SelectItem value="250">250 pages</SelectItem>
                        <SelectItem value="500">500 pages</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Max Depth */}
                {crawlMode === 'discovery' && (
                  <div>
                    <Label htmlFor="maxDepth">Max Depth</Label>
                    <Select value={maxDepth.toString()} onValueChange={(value) => setMaxDepth(parseInt(value))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 level</SelectItem>
                        <SelectItem value="2">2 levels</SelectItem>
                        <SelectItem value="3">3 levels</SelectItem>
                        <SelectItem value="4">4 levels</SelectItem>
                        <SelectItem value="5">5 levels</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Include/Exclude Paths */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="includePaths">Include Paths (optional)</Label>
                  <Input
                    id="includePaths"
                    type="text"
                    value={includePaths}
                    onChange={(e) => setIncludePaths(e.target.value)}
                    placeholder="/blog, /docs, /help"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Comma-separated paths to include
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="excludePaths">Exclude Paths (optional)</Label>
                  <Input
                    id="excludePaths"
                    type="text"
                    value={excludePaths}
                    onChange={(e) => setExcludePaths(e.target.value)}
                    placeholder="/admin, /private, /login"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Comma-separated paths to exclude
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="single-site" className="space-y-6 mt-0">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  Single site mode will only process the exact URL provided without following any links.
                  This is perfect for adding specific pages or documents to your knowledge base.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="sitemap" className="space-y-6 mt-0">
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    Sitemap mode will automatically discover your website's sitemap.xml file and crawl all listed pages.
                    This is the most efficient way to crawl well-structured websites.
                  </p>
                </div>

                <div>
                  <Label htmlFor="maxPages">Max Pages from Sitemap</Label>
                  <Select value={maxPages.toString()} onValueChange={(value) => setMaxPages(parseInt(value))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 pages</SelectItem>
                      <SelectItem value="50">50 pages</SelectItem>
                      <SelectItem value="100">100 pages</SelectItem>
                      <SelectItem value="250">250 pages</SelectItem>
                      <SelectItem value="500">500 pages</SelectItem>
                      <SelectItem value="1000">1000 pages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Respect Robots - Common across all tabs */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="respectRobots"
                checked={respectRobots}
                onChange={(e) => setRespectRobots(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="respectRobots" className="text-sm">
                Respect robots.txt and crawl delays
              </Label>
            </div>

            {/* Submit Button - Right aligned */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading || !url.trim()}
                className="px-8"
              >
                {getButtonText()}
              </Button>
            </div>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EnhancedWebsiteCrawlFormV3;
