
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [url, setUrl] = useState('');
  const [crawlMode, setCrawlMode] = useState<'single' | 'sitemap' | 'discovery'>('discovery');
  const [maxPages, setMaxPages] = useState(50);
  const [maxDepth, setMaxDepth] = useState(3);
  const [respectRobots, setRespectRobots] = useState(true);
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
      console.log('🚀 Starting enhanced crawl with V3 form:', {
        url: url.trim(),
        crawlMode,
        maxPages,
        maxDepth,
        respectRobots,
        agentId
      });

      const result = await initiateCrawl({
        url: url.trim(),
        agentId,
        crawlMode: crawlMode === 'single' ? 'single-page' : crawlMode === 'sitemap' ? 'sitemap-only' : 'full-website',
        maxPages,
        respectRobots
      });

      if (result.parentSourceId) {
        toast({
          title: "Enhanced Crawl Started Successfully",
          description: `Your ${crawlMode} crawl has been initiated with production infrastructure. Monitoring ${result.parentSourceId}`,
        });

        onCrawlStarted?.(result.parentSourceId);
        setUrl('');
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
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* URL Input */}
            <div className="md:col-span-2">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
                className="mt-1"
              />
            </div>

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

            {/* Respect Robots */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="respectRobots"
                checked={respectRobots}
                onChange={(e) => setRespectRobots(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="respectRobots" className="text-sm">
                Respect robots.txt
              </Label>
            </div>
          </div>

          {/* Submit Button - Right aligned */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading || !url.trim()}
              className="px-8"
            >
              {loading ? "Starting Crawl..." : "Start Website Crawl"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EnhancedWebsiteCrawlFormV3;
