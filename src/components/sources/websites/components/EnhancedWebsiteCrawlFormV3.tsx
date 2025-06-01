
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEnhancedCrawl } from '@/hooks/useEnhancedCrawl';
import { useParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Globe, FileText, Map, Settings } from 'lucide-react';

interface Props {
  onCrawlStarted?: (parentSourceId: string) => void;
}

const EnhancedWebsiteCrawlFormV3: React.FC<Props> = ({ onCrawlStarted }) => {
  const { agentId } = useParams();
  const { initiateCrawl, isLoading } = useEnhancedCrawl();
  
  const [url, setUrl] = useState('');
  const [crawlMode, setCrawlMode] = useState<'full-website' | 'single-page' | 'sitemap-only'>('full-website');
  const [maxPages, setMaxPages] = useState(100);
  const [excludePaths, setExcludePaths] = useState('/wp-json/*, /wp-admin/*, /xmlrpc.php, /checkout/*, /cart/*');
  const [respectRobots, setRespectRobots] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agentId) {
      toast({
        title: "Error",
        description: "No agent ID found",
        variant: "destructive"
      });
      return;
    }

    if (!url.trim()) {
      toast({
        title: "Error",
        description: "Please enter a URL",
        variant: "destructive"
      });
      return;
    }

    // Validate sitemap URL
    if (crawlMode === 'sitemap-only' && !url.toLowerCase().includes('sitemap')) {
      toast({
        title: "Warning",
        description: "For sitemap crawling, the URL should typically end with 'sitemap.xml' or contain 'sitemap'",
        variant: "destructive"
      });
      return;
    }

    try {
      const excludePathsArray = excludePaths
        .split(',')
        .map(path => path.trim())
        .filter(path => path.length > 0);

      const result = await initiateCrawl({
        agentId,
        url: url.trim(),
        crawlMode,
        maxPages: crawlMode === 'single-page' ? 1 : maxPages,
        excludePaths: excludePathsArray,
        respectRobots,
        enableCompression: true,
        enableDeduplication: true,
        priority: 'normal'
      });

      if (result && onCrawlStarted) {
        onCrawlStarted(result.parentSourceId);
      }

      // Clear form
      setUrl('');
      setCrawlMode('full-website');
      setMaxPages(100);
      setExcludePaths('/wp-json/*, /wp-admin/*, /xmlrpc.php, /checkout/*, /cart/*');
      setRespectRobots(true);

    } catch (error) {
      console.error('Error starting crawl:', error);
    }
  };

  const getCrawlModeDescription = () => {
    switch (crawlMode) {
      case 'full-website':
        return 'Crawl the entire website by discovering and following all internal links';
      case 'single-page':
        return 'Crawl only the specific URL provided, no link discovery';
      case 'sitemap-only':
        return 'Parse sitemap.xml file and crawl only URLs listed in the sitemap';
    }
  };

  const getCrawlModeIcon = () => {
    switch (crawlMode) {
      case 'full-website':
        return <Globe className="w-4 h-4" />;
      case 'single-page':
        return <FileText className="w-4 h-4" />;
      case 'sitemap-only':
        return <Map className="w-4 h-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getCrawlModeIcon()}
          Enhanced Website Crawling
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="url">Website URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          {/* Crawl Mode Selection */}
          <div className="space-y-2">
            <Label htmlFor="crawlMode">Crawl Mode</Label>
            <Select value={crawlMode} onValueChange={(value: any) => setCrawlMode(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select crawl mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full-website">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Full Website
                  </div>
                </SelectItem>
                <SelectItem value="single-page">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Single Page Only
                  </div>
                </SelectItem>
                <SelectItem value="sitemap-only">
                  <div className="flex items-center gap-2">
                    <Map className="w-4 h-4" />
                    Sitemap Only
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {getCrawlModeDescription()}
            </p>
          </div>

          {/* Advanced Settings Accordion */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="advanced">
              <AccordionTrigger className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Advanced Settings
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                {/* Max Pages - Only show for full website mode */}
                {crawlMode === 'full-website' && (
                  <div className="space-y-2">
                    <Label htmlFor="maxPages">Maximum Pages to Crawl</Label>
                    <Input
                      id="maxPages"
                      type="number"
                      min="1"
                      max="1000"
                      value={maxPages}
                      onChange={(e) => setMaxPages(parseInt(e.target.value) || 100)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Limit the number of pages to crawl (1-1000)
                    </p>
                  </div>
                )}

                {/* Exclude Paths - Only show for full website and sitemap modes */}
                {(crawlMode === 'full-website' || crawlMode === 'sitemap-only') && (
                  <div className="space-y-2">
                    <Label htmlFor="excludePaths">Exclude Paths</Label>
                    <Textarea
                      id="excludePaths"
                      placeholder="/wp-json/*, /wp-admin/*, /checkout/*"
                      value={excludePaths}
                      onChange={(e) => setExcludePaths(e.target.value)}
                      rows={3}
                    />
                    <p className="text-sm text-muted-foreground">
                      Comma-separated list of paths to exclude (wildcards supported with *)
                    </p>
                  </div>
                )}

                {/* Respect Robots.txt */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="respectRobots"
                    checked={respectRobots}
                    onCheckedChange={setRespectRobots}
                  />
                  <Label htmlFor="respectRobots">Respect robots.txt</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Follow robots.txt directives when crawling (recommended)
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Submit Button */}
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Starting Crawl...' : `Start ${crawlMode === 'single-page' ? 'Single Page' : crawlMode === 'sitemap-only' ? 'Sitemap' : 'Website'} Crawl`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default EnhancedWebsiteCrawlFormV3;
