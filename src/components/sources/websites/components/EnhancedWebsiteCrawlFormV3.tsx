
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useOptimisticWebsiteCrawl } from '@/hooks/useOptimisticWebsiteCrawl';
import { Globe, FileText, Map } from 'lucide-react';

interface EnhancedWebsiteCrawlFormV3Props {
  onCrawlStarted?: (parentSourceId: string) => void;
}

const EnhancedWebsiteCrawlFormV3: React.FC<EnhancedWebsiteCrawlFormV3Props> = ({
  onCrawlStarted
}) => {
  const [activeTab, setActiveTab] = useState('website');
  const [url, setUrl] = useState('');
  const [protocol, setProtocol] = useState('https://');
  const [includePaths, setIncludePaths] = useState('');
  const [excludePaths, setExcludePaths] = useState('');

  const { submitWebsite, isSubmitting } = useOptimisticWebsiteCrawl();

  const getUrlPlaceholder = () => {
    switch (activeTab) {
      case 'website':
        return 'example.com';
      case 'single-site':
        return 'example.com/specific-page';
      case 'sitemap':
        return 'example.com';
      default:
        return 'example.com';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid URL",
        variant: "destructive"
      });
      return;
    }

    const fullUrl = url.startsWith('http') ? url : `${protocol}${url.trim()}`;
    
    console.log('⚡ INSTANT FEEDBACK: Starting optimistic crawl submission:', {
      url: fullUrl,
      activeTab,
      timestamp: new Date().toISOString()
    });

    try {
      // Convert tab to the expected crawl mode format
      let finalCrawlMode: 'single-page' | 'sitemap-only' | 'full-website' = 'full-website';
      if (activeTab === 'single-site') {
        finalCrawlMode = 'single-page';
      } else if (activeTab === 'sitemap') {
        finalCrawlMode = 'sitemap-only';
      } else {
        finalCrawlMode = 'full-website';
      }

      // Parse include/exclude paths
      const includePathsArray = includePaths.split(',').map(p => p.trim()).filter(p => p.length > 0);
      const excludePathsArray = excludePaths.split(',').map(p => p.trim()).filter(p => p.length > 0);

      // INSTANT FEEDBACK: This will immediately show the source in the UI with "Submitting..." status
      const result = await submitWebsite({
        url: fullUrl,
        crawlMode: finalCrawlMode,
        maxPages: 250, // Use default high value
        maxDepth: 5, // Use default high value
        respectRobots: true, // Always respect robots.txt
        includePaths: includePathsArray,
        excludePaths: excludePathsArray
      });

      if (result?.parentSourceId) {
        onCrawlStarted?.(result.parentSourceId);

        // Reset form after successful submission
        setUrl('');
        setIncludePaths('');
        setExcludePaths('');
        
        console.log('✅ INSTANT FEEDBACK: Form reset after successful submission');
      }
    } catch (error: any) {
      console.error('❌ INSTANT FEEDBACK: Form submission failed:', error);
      // Error handling is done in the optimistic hook
    }
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
    if (isSubmitting) {
      switch (activeTab) {
        case 'website':
          return "Starting Website Crawl...";
        case 'single-site':
          return "Adding Page...";
        case 'sitemap':
          return "Starting Sitemap Crawl...";
        default:
          return "Processing...";
      }
    }
    switch (activeTab) {
      case 'website':
        return "Start Website Crawl";
      case 'single-site':
        return "Add Single Page";
      case 'sitemap':
        return "Start Sitemap Crawl";
      default:
        return "Start Crawl";
    }
  };

  return (
    <Card>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 my-[20px]">
            <TabsTrigger value="website" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Website
            </TabsTrigger>
            <TabsTrigger value="single-site" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Single Site
            </TabsTrigger>
            <TabsTrigger value="sitemap" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Sitemap
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 mb-6">
            <p className="text-sm text-gray-600">{getTabDescription()}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                <Input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder={getUrlPlaceholder()} required disabled={isSubmitting} />
              </div>
            </div>

            <TabsContent value="website" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="includePaths">Include Paths (optional)</Label>
                  <Input id="includePaths" type="text" value={includePaths} onChange={e => setIncludePaths(e.target.value)} placeholder="/blog, /docs, /help" className="mt-1" disabled={isSubmitting} />
                  <p className="text-sm text-gray-500 mt-1">
                    Comma-separated paths to include
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="excludePaths">Exclude Paths (optional)</Label>
                  <Input id="excludePaths" type="text" value={excludePaths} onChange={e => setExcludePaths(e.target.value)} placeholder="/admin, /private, /login" className="mt-1" disabled={isSubmitting} />
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
              </div>
            </TabsContent>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || !url.trim()} className="px-8">
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
