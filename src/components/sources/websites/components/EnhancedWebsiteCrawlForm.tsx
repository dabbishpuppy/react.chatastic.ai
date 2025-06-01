
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useEnhancedCrawl } from '@/hooks/useEnhancedCrawl';
import { EnhancedCrawlRequest } from '@/services/rag/enhanced/crawlTypes';
import { useParams } from 'react-router-dom';

interface EnhancedWebsiteCrawlFormProps {
  onCrawlInitiated?: () => void;
}

const EnhancedWebsiteCrawlForm: React.FC<EnhancedWebsiteCrawlFormProps> = ({ 
  onCrawlInitiated 
}) => {
  const { agentId } = useParams();
  const { initiateCrawl, isLoading } = useEnhancedCrawl();
  
  const [formData, setFormData] = useState({
    url: '',
    excludePaths: '/wp-json/*\n/wp-admin/*\n/xmlrpc.php\n/checkout/*\n/cart/*\n/admin/*\n/api/*\n*.json\n*.xml\n*.rss',
    includePaths: '',
    respectRobots: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.url.trim()) {
      newErrors.url = 'URL is required';
    } else {
      try {
        new URL(formData.url);
      } catch {
        newErrors.url = 'Please enter a valid URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !agentId) return;

    try {
      const request: EnhancedCrawlRequest = {
        agentId,
        url: formData.url.trim(),
        excludePaths: formData.excludePaths
          .split('\n')
          .map(path => path.trim())
          .filter(path => path.length > 0),
        includePaths: formData.includePaths
          .split('\n')
          .map(path => path.trim())
          .filter(path => path.length > 0),
        respectRobots: formData.respectRobots
      };

      await initiateCrawl(request);
      
      // Reset form
      setFormData({
        url: '',
        excludePaths: '/wp-json/*\n/wp-admin/*\n/xmlrpc.php\n/checkout/*\n/cart/*\n/admin/*\n/api/*\n*.json\n*.xml\n*.rss',
        includePaths: '',
        respectRobots: true
      });
      
      onCrawlInitiated?.();
    } catch (error) {
      console.error('Failed to initiate crawl:', error);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Enhanced Website Crawler</CardTitle>
        <p className="text-sm text-muted-foreground">
          Industrial-scale crawling with compression and global deduplication
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="url">Website URL *</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className={errors.url ? 'border-red-500' : ''}
            />
            {errors.url && <p className="text-sm text-red-500">{errors.url}</p>}
          </div>

          <Separator />

          {/* Advanced Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Advanced Configuration</h3>
            
            {/* Exclude Paths */}
            <div className="space-y-2">
              <Label htmlFor="excludePaths">
                Exclude Paths
                <span className="text-sm text-muted-foreground ml-2">
                  (one per line, supports wildcards *)
                </span>
              </Label>
              <Textarea
                id="excludePaths"
                placeholder="/wp-json/*&#10;/admin/*"
                value={formData.excludePaths}
                onChange={(e) => setFormData({ ...formData, excludePaths: e.target.value })}
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Pre-filled with common boilerplate endpoints to skip
              </p>
            </div>

            {/* Include Paths */}
            <div className="space-y-2">
              <Label htmlFor="includePaths">
                Include Paths (Optional)
                <span className="text-sm text-muted-foreground ml-2">
                  (if specified, only these paths will be crawled)
                </span>
              </Label>
              <Textarea
                id="includePaths"
                placeholder="/blog/*&#10;/products/*"
                value={formData.includePaths}
                onChange={(e) => setFormData({ ...formData, includePaths: e.target.value })}
                rows={3}
                className="font-mono text-sm"
              />
            </div>

            {/* Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between space-x-2">
                <div>
                  <Label htmlFor="respectRobots">Respect robots.txt</Label>
                  <p className="text-xs text-muted-foreground">
                    Obey website crawling rules
                  </p>
                </div>
                <Switch
                  id="respectRobots"
                  checked={formData.respectRobots}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, respectRobots: checked })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Features Overview */}
          <div className="space-y-2">
            <h4 className="font-medium">Enhanced Features:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• High-efficiency compression (targets ~1-2KB per page)</li>
              <li>• Global deduplication across all customers</li>
              <li>• Intelligent content extraction and boilerplate removal</li>
              <li>• Semantic chunking with quality pruning (top 5 chunks per page)</li>
              <li>• Real-time progress tracking with parent/child status workflow</li>
              <li>• Industrial-scale architecture with proper error handling</li>
            </ul>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={isLoading}
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
