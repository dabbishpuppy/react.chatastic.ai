
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, FileText, Map } from 'lucide-react';

interface WebsiteFormSectionProps {
  activeSubTab: string;
  setActiveSubTab: (tab: string) => void;
  url: string;
  setUrl: (url: string) => void;
  protocol: string;
  setProtocol: (protocol: string) => void;
  includePaths: string;
  setIncludePaths: (paths: string) => void;
  excludePaths: string;
  setExcludePaths: (paths: string) => void;
  onSubmit: (crawlType: 'crawl-links' | 'sitemap' | 'individual-link', options?: { maxPages?: number; maxDepth?: number; concurrency?: number }) => Promise<void>;
  isSubmitting: boolean;
}

const WebsiteFormSection: React.FC<WebsiteFormSectionProps> = ({
  activeSubTab,
  setActiveSubTab,
  url,
  setUrl,
  protocol,
  setProtocol,
  includePaths,
  setIncludePaths,
  excludePaths,
  setExcludePaths,
  onSubmit,
  isSubmitting
}) => {
  const [maxPages, setMaxPages] = React.useState("50");
  const [maxDepth, setMaxDepth] = React.useState("3");
  const [concurrency, setConcurrency] = React.useState("2");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const fullUrl = url.startsWith('http') ? url : `${protocol}${url}`;
    
    // Update the URL state with the full URL
    setUrl(fullUrl);

    const options = {
      maxPages: parseInt(maxPages) || 50,
      maxDepth: parseInt(maxDepth) || 3,
      concurrency: parseInt(concurrency) || 2
    };

    await onSubmit(activeSubTab as 'crawl-links' | 'sitemap' | 'individual-link', options);
  };

  return (
    <Card className="border border-gray-200 mb-6">
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold mb-4">Add Website</h3>
        
        <Tabs defaultValue="crawl-links" value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
          <TabsList className="mb-6 bg-transparent p-0 border-b border-gray-200 w-full flex space-x-6">
            <TabsTrigger value="crawl-links" className="rounded-none px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none font-medium flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Crawl links
            </TabsTrigger>
            <TabsTrigger value="sitemap" className="rounded-none px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none font-medium flex items-center gap-2">
              <Map className="w-4 h-4" />
              Sitemap
            </TabsTrigger>
            <TabsTrigger value="individual-link" className="rounded-none px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Individual link
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="website-url" className="text-sm font-medium">
                  Website URL
                </Label>
                <div className="flex mt-2">
                  <Select value={protocol} onValueChange={setProtocol}>
                    <SelectTrigger className="w-32 rounded-r-none border-r-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="https://">https://</SelectItem>
                      <SelectItem value="http://">http://</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="website-url"
                    type="text"
                    value={url.replace(/^https?:\/\//, '')}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="example.com"
                    className="rounded-l-none"
                    required
                  />
                </div>
              </div>

              <TabsContent value="crawl-links" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="max-pages" className="text-sm font-medium">
                      Max Pages
                    </Label>
                    <Input
                      id="max-pages"
                      type="number"
                      value={maxPages}
                      onChange={(e) => setMaxPages(e.target.value)}
                      min="1"
                      max="1000"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-depth" className="text-sm font-medium">
                      Max Depth
                    </Label>
                    <Input
                      id="max-depth"
                      type="number"
                      value={maxDepth}
                      onChange={(e) => setMaxDepth(e.target.value)}
                      min="1"
                      max="10"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="concurrency" className="text-sm font-medium">
                      Concurrency
                    </Label>
                    <Input
                      id="concurrency"
                      type="number"
                      value={concurrency}
                      onChange={(e) => setConcurrency(e.target.value)}
                      min="1"
                      max="10"
                      className="mt-2"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="include-paths" className="text-sm font-medium">
                      Include Paths (optional)
                    </Label>
                    <Textarea
                      id="include-paths"
                      value={includePaths}
                      onChange={(e) => setIncludePaths(e.target.value)}
                      placeholder="/blog/*&#10;/docs/*"
                      className="mt-2 h-20"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      One path per line. Use * for wildcards.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="exclude-paths" className="text-sm font-medium">
                      Exclude Paths (optional)
                    </Label>
                    <Textarea
                      id="exclude-paths"
                      value={excludePaths}
                      onChange={(e) => setExcludePaths(e.target.value)}
                      placeholder="/admin/*&#10;/private/*"
                      className="mt-2 h-20"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      One path per line. Use * for wildcards.
                    </p>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm">
                  Crawl your website by following internal links. Set limits on pages and depth to control the scope.
                </p>
              </TabsContent>

              <TabsContent value="sitemap" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="include-paths-sitemap" className="text-sm font-medium">
                      Include Paths (optional)
                    </Label>
                    <Textarea
                      id="include-paths-sitemap"
                      value={includePaths}
                      onChange={(e) => setIncludePaths(e.target.value)}
                      placeholder="/blog/*&#10;/docs/*"
                      className="mt-2 h-20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="exclude-paths-sitemap" className="text-sm font-medium">
                      Exclude Paths (optional)
                    </Label>
                    <Textarea
                      id="exclude-paths-sitemap"
                      value={excludePaths}
                      onChange={(e) => setExcludePaths(e.target.value)}
                      placeholder="/admin/*&#10;/private/*"
                      className="mt-2 h-20"
                    />
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm">
                  Crawl your website using the sitemap.xml file. This will automatically find and crawl all pages listed in your sitemap.
                </p>
              </TabsContent>

              <TabsContent value="individual-link" className="mt-4 space-y-4">
                <p className="text-gray-600 text-sm">
                  Add a specific page from your website. Only the exact URL you provide will be crawled.
                </p>
              </TabsContent>
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isSubmitting || !url.trim()}
                className="min-w-32"
              >
                {isSubmitting ? 'Adding...' : `Add ${activeSubTab === 'crawl-links' ? 'Website' : activeSubTab === 'sitemap' ? 'Sitemap' : 'Page'}`}
              </Button>
            </div>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default WebsiteFormSection;
