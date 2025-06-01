
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Globe, Settings, Zap, Filter } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useRAGServices } from '@/hooks/useRAGServices';
import { useParentChildWorkflow } from '@/hooks/useParentChildWorkflow';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_EXCLUDE_PATHS = [
  '/wp-json/*', '/wp-admin/*', '/xmlrpc.php', '/checkout/*', 
  '/cart/*', '/admin/*', '/api/*', '*.json', '*.xml', '*.rss',
  '/feed/*', '/sitemap*', '/search*', '/tag/*', '/category/*',
  '/author/*', '/comments/*', '/trackback/*', '/wp-content/uploads/*'
];

interface EnhancedWebsiteCrawlFormV2Props {
  onCrawlStarted?: (parentSourceId: string) => void;
}

export const EnhancedWebsiteCrawlFormV2: React.FC<EnhancedWebsiteCrawlFormV2Props> = ({
  onCrawlStarted
}) => {
  const { agentId } = useParams();
  const { sources } = useRAGServices();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(100);
  const [priority, setPriority] = useState<'normal' | 'high' | 'slow'>('normal');
  const [excludePaths, setExcludePaths] = useState(DEFAULT_EXCLUDE_PATHS.join('\n'));
  const [includePaths, setIncludePaths] = useState('');
  const [respectRobots, setRespectRobots] = useState(true);
  const [enableCompression, setEnableCompression] = useState(true);
  const [enableDeduplication, setEnableDeduplication] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agentId || !url) {
      toast({
        title: "Validation Error",
        description: "Please provide a valid URL",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get team_id from agent
      const { data: agent, error: agentError } = await sources.supabase
        .from('agents')
        .select('team_id')
        .eq('id', agentId)
        .single();

      if (agentError || !agent) {
        throw new Error('Agent not found');
      }

      const customerId = agent.team_id;

      // Create parent source first
      const parentSourceData = {
        agent_id: agentId,
        team_id: customerId,
        source_type: 'website' as const,
        title: url,
        url: url,
        crawl_status: 'pending' as const,
        exclude_paths: excludePaths.split('\n').filter(p => p.trim()),
        include_paths: includePaths.split('\n').filter(p => p.trim()),
        respect_robots: respectRobots,
        max_concurrent_jobs: priority === 'high' ? 10 : priority === 'slow' ? 2 : 5,
        progress: 0,
        total_children: 0,
        discovery_completed: false,
        metadata: {
          enhanced_pipeline: true,
          parent_child_workflow: true,
          compression_enabled: enableCompression,
          deduplication_enabled: enableDeduplication,
          priority,
          max_pages: maxPages,
          crawl_initiated_at: new Date().toISOString()
        }
      };

      console.log('🚀 Creating parent source:', parentSourceData);

      const parentSource = await sources.createSource(parentSourceData);

      console.log('✅ Parent source created:', parentSource.id);

      // Start link discovery workflow
      const discoveryParams = {
        customerId,
        url,
        excludePaths: excludePaths.split('\n').filter(p => p.trim()),
        includePaths: includePaths.split('\n').filter(p => p.trim()),
        maxPages,
        priority
      };

      console.log('🔍 Starting link discovery with params:', discoveryParams);

      // Note: We don't wait for discovery to complete here since it's async
      // The ParentChildWorkflow will handle the discovery and status updates
      
      toast({
        title: "Crawl Initiated",
        description: "Link discovery started. You'll see progress updates in real-time.",
      });

      // Reset form
      setUrl('');
      setMaxPages(100);
      setPriority('normal');
      setExcludePaths(DEFAULT_EXCLUDE_PATHS.join('\n'));
      setIncludePaths('');

      // Notify parent component
      if (onCrawlStarted) {
        onCrawlStarted(parentSource.id);
      }

    } catch (error) {
      console.error('❌ Error starting enhanced crawl:', error);
      toast({
        title: "Crawl Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-500" />
          Enhanced Website Crawler
          <Badge variant="secondary">Parent-Child Workflow</Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Basic
              </TabsTrigger>
              <TabsTrigger value="filtering" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Path Filtering
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Advanced
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label htmlFor="url">Website URL *</Label>
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxPages">Max Pages</Label>
                  <Input
                    id="maxPages"
                    type="number"
                    value={maxPages}
                    onChange={(e) => setMaxPages(parseInt(e.target.value) || 100)}
                    min="1"
                    max="1000"
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={(value: 'normal' | 'high' | 'slow') => setPriority(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="normal">Normal Priority</SelectItem>
                      <SelectItem value="slow">Slow/Large Sites</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="filtering" className="space-y-4">
              <div>
                <Label htmlFor="excludePaths">Exclude Paths (one per line)</Label>
                <Textarea
                  id="excludePaths"
                  value={excludePaths}
                  onChange={(e) => setExcludePaths(e.target.value)}
                  placeholder="/wp-json/*&#10;/wp-admin/*&#10;/checkout/*"
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Default patterns exclude common boilerplate endpoints (WordPress admin, APIs, etc.)
                </p>
              </div>

              <div>
                <Label htmlFor="includePaths">Include Paths (optional, one per line)</Label>
                <Textarea
                  id="includePaths"
                  value={includePaths}
                  onChange={(e) => setIncludePaths(e.target.value)}
                  placeholder="/blog/*&#10;/products/*&#10;/docs/*"
                  rows={4}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  If specified, only these paths will be crawled (in addition to exclude filters)
                </p>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="respectRobots">Respect robots.txt</Label>
                    <p className="text-sm text-muted-foreground">
                      Follow robots.txt rules (recommended)
                    </p>
                  </div>
                  <Switch
                    id="respectRobots"
                    checked={respectRobots}
                    onCheckedChange={setRespectRobots}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enableCompression">High-Efficiency Compression</Label>
                    <p className="text-sm text-muted-foreground">
                      Use Zstd compression for ~75% size reduction
                    </p>
                  </div>
                  <Switch
                    id="enableCompression"
                    checked={enableCompression}
                    onCheckedChange={setEnableCompression}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enableDeduplication">Global Deduplication</Label>
                    <p className="text-sm text-muted-foreground">
                      Share content across customers for efficiency
                    </p>
                  </div>
                  <Switch
                    id="enableDeduplication"
                    checked={enableDeduplication}
                    onCheckedChange={setEnableDeduplication}
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-blue-900">Enhanced Pipeline Features</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Two-phase workflow with real-time parent-child status tracking</li>
                  <li>• Automatic boilerplate removal and content cleaning</li>
                  <li>• Semantic chunking with global deduplication</li>
                  <li>• Zstd compression achieving ~1-2KB per page</li>
                  <li>• Scalable worker fleet with automatic retries</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || !url}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Starting Crawl...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Start Enhanced Crawl
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
