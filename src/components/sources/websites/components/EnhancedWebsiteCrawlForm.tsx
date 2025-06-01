
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Shield, Settings, Zap } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useEnhancedCrawl } from '@/hooks/useEnhancedCrawl';

interface EnhancedWebsiteCrawlFormProps {
  onSuccess?: () => void;
}

const EnhancedWebsiteCrawlForm: React.FC<EnhancedWebsiteCrawlFormProps> = ({ onSuccess }) => {
  const { agentId } = useParams();
  const { initiateCrawl, isLoading } = useEnhancedCrawl();
  
  const [url, setUrl] = useState('');
  const [excludePaths, setExcludePaths] = useState('/wp-json/*, /wp-admin/*, /xmlrpc.php, /checkout/*, /cart/*, /admin/*, /api/*, *.json, *.xml, *.rss');
  const [includePaths, setIncludePaths] = useState('');
  const [respectRobots, setRespectRobots] = useState(true);
  const [maxConcurrentJobs, setMaxConcurrentJobs] = useState(5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agentId || !url) return;

    try {
      const excludePathsArray = excludePaths
        .split(',')
        .map(path => path.trim())
        .filter(path => path.length > 0);
        
      const includePathsArray = includePaths
        .split(',')
        .map(path => path.trim())
        .filter(path => path.length > 0);

      await initiateCrawl({
        agentId,
        url: url.trim(),
        excludePaths: excludePathsArray,
        includePaths: includePathsArray,
        respectRobots,
        maxConcurrentJobs
      });

      // Reset form
      setUrl('');
      onSuccess?.();
      
    } catch (error) {
      console.error('Enhanced crawl submission error:', error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-500" />
          Enhanced Website Crawl
        </CardTitle>
        <CardDescription>
          Advanced crawling with global deduplication, compression, and real-time progress tracking
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="url" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Website URL
            </Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Shield className="h-4 w-4" />
              Filtering & Security
            </Label>
            
            <div className="space-y-2">
              <Label htmlFor="exclude-paths">
                Exclude Paths
                <Badge variant="secondary" className="ml-2">Recommended</Badge>
              </Label>
              <Textarea
                id="exclude-paths"
                value={excludePaths}
                onChange={(e) => setExcludePaths(e.target.value)}
                placeholder="/wp-json/*, /wp-admin/*, /api/*"
                className="font-mono text-sm"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated patterns. Use * for wildcards. Pre-filled with common WordPress and admin endpoints.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="include-paths">Include Paths (Optional)</Label>
              <Textarea
                id="include-paths"
                value={includePaths}
                onChange={(e) => setIncludePaths(e.target.value)}
                placeholder="/blog/*, /docs/*, /help/*"
                className="font-mono text-sm"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                If specified, only paths matching these patterns will be crawled.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Respect robots.txt</Label>
                <p className="text-xs text-muted-foreground">
                  Follow website's crawling guidelines
                </p>
              </div>
              <Switch
                checked={respectRobots}
                onCheckedChange={setRespectRobots}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Settings className="h-4 w-4" />
              Performance Settings
            </Label>
            
            <div className="space-y-2">
              <Label htmlFor="max-concurrent">Max Concurrent Jobs</Label>
              <Input
                id="max-concurrent"
                type="number"
                min="1"
                max="20"
                value={maxConcurrentJobs}
                onChange={(e) => setMaxConcurrentJobs(parseInt(e.target.value) || 5)}
              />
              <p className="text-xs text-muted-foreground">
                Higher values crawl faster but may overwhelm the target server. Recommended: 5-10.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">✨ Enhanced Features</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Global deduplication across all customers for maximum efficiency</li>
              <li>• Advanced Zstandard compression (~90% storage reduction)</li>
              <li>• Real-time progress tracking with individual page status</li>
              <li>• Automatic retry logic for failed pages</li>
              <li>• Intelligent content cleaning and semantic chunking</li>
            </ul>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading || !url}
            className="w-full"
          >
            {isLoading ? 'Initiating Crawl...' : 'Start Enhanced Crawl'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default EnhancedWebsiteCrawlForm;
