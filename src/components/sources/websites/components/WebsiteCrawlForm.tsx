
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useParams } from 'react-router-dom';
import { useWorkflowCrawlIntegration } from '@/hooks/useWorkflowCrawlIntegration';
import { Loader2, Plus } from 'lucide-react';

const WebsiteCrawlForm: React.FC = () => {
  const [url, setUrl] = useState('');
  const { agentId } = useParams();
  const { initiateWebsiteCrawl, isLoading } = useWorkflowCrawlIntegration();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim() || !agentId) return;

    try {
      // Generate a temporary source ID for the workflow
      const tempSourceId = crypto.randomUUID();
      
      await initiateWebsiteCrawl(agentId, tempSourceId, url.trim(), {
        crawlMode: 'full-website',
        maxPages: 100,
        maxDepth: 3,
        respectRobots: true
      });
      
      setUrl('');
    } catch (error) {
      console.error('Error starting crawl:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="url"
        placeholder="Enter website URL to crawl"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="flex-1"
        disabled={isLoading}
        required
      />
      <Button 
        type="submit" 
        disabled={isLoading || !url.trim()}
        className="flex items-center gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {isLoading ? 'Adding...' : 'Add Website'}
      </Button>
    </form>
  );
};

export default WebsiteCrawlForm;
