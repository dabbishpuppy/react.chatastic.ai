
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Globe } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWebsiteSubmission } from '../useWebsiteSubmission';
import { toast } from '@/hooks/use-toast';

const EnhancedWebsiteCrawlFormV4: React.FC = () => {
  const [url, setUrl] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(true);
  const { submitWebsite, isSubmitting } = useWebsiteSubmission();

  const validateUrl = (urlString: string) => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value) {
      setIsValidUrl(validateUrl(value));
    } else {
      setIsValidUrl(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url || !isValidUrl) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL starting with http:// or https://",
        variant: "destructive"
      });
      return;
    }

    try {
      await submitWebsite({
        url,
        respectRobots: true,
        excludePaths: [],
        includePaths: [],
        maxConcurrentJobs: 5
      });

      toast({
        title: "Crawl Started",
        description: "Website crawling has been initiated. You can retrain the agent once crawling is complete.",
      });

      setUrl('');
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Error",
        description: "Failed to start crawl. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Add Website Source
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Website URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              className={!isValidUrl ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {!isValidUrl && (
              <p className="text-sm text-red-500">
                Please enter a valid URL starting with http:// or https://
              </p>
            )}
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Two-Phase Process:</strong>
              <br />
              1. <strong>Crawl Phase:</strong> Click "Start Crawl" to discover and crawl all pages
              <br />
              2. <strong>Training Phase:</strong> After crawling completes, click "Retrain Agent" to create chunks and embeddings
            </AlertDescription>
          </Alert>

          <Button 
            type="submit" 
            disabled={!url || !isValidUrl || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Starting Crawl...' : 'Start Crawl'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default EnhancedWebsiteCrawlFormV4;
