
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { ExternalLink, MoreHorizontal, ChevronRight, Info, Link } from "lucide-react";

const WebsiteTab: React.FC = () => {
  const [url, setUrl] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("crawl-links");
  const [includePaths, setIncludePaths] = useState("");
  const [excludePaths, setExcludePaths] = useState("");

  // Mock data for website sources
  const websites = [
    { id: "1", url: "https://wonderwave.no/terms", lastScraped: "15 days ago", size: "7 KB" },
    { id: "2", url: "https://wonderwave.no/privacy", lastScraped: "15 days ago", size: "5 KB" },
    { id: "3", url: "https://wonderwave.no/confidentiality", lastScraped: "15 days ago", size: "3 KB" },
    { id: "4", url: "https://wonderwave.no/", lastScraped: "15 days ago", size: "8 KB" },
  ];

  const handleFetchLinks = () => {
    if (!url) {
      toast({
        title: "URL required",
        description: "Please enter a URL to fetch links from",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Links fetching initiated",
      description: "Your request is being processed",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Website</h2>
        <div className="text-right">
          <div className="text-sm text-gray-500 mb-1">Total size: 23 KB / 33 MB</div>
          <Button className="bg-black hover:bg-gray-800">
            Retrain agent
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-gray-600">
            Crawl specific web pages or submit sitemaps to continuously update your AI with the latest content.
            Configure included and excluded paths to refine what your AI learns. 
            <a href="#" className="text-blue-600 hover:underline ml-1">Learn more</a>
          </p>
        </div>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">Link</h3>
            
            <Tabs defaultValue="crawl-links" value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
              <TabsList className="mb-6 bg-transparent p-0 border-b border-gray-200 w-full flex space-x-6">
                <TabsTrigger 
                  value="crawl-links" 
                  className="rounded-none px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none font-medium"
                >
                  Crawl links
                </TabsTrigger>
                <TabsTrigger 
                  value="sitemap" 
                  className="rounded-none px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none font-medium"
                >
                  Sitemap
                </TabsTrigger>
                <TabsTrigger 
                  value="individual-link" 
                  className="rounded-none px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none font-medium"
                >
                  Individual link
                </TabsTrigger>
              </TabsList>

              <TabsContent value="crawl-links" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                      URL
                    </label>
                    <div className="flex">
                      <div className="relative flex items-center min-w-[120px]">
                        <select className="h-full rounded-l-md border border-r-0 border-gray-300 bg-white pl-3 pr-8 py-0 text-sm">
                          <option>https://</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 20 20">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4"/>
                          </svg>
                        </div>
                      </div>
                      <Input
                        id="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="www.example.com"
                        className="flex-1 rounded-l-none border-l-0"
                      />
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-md flex items-start">
                    <Info size={18} className="text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-sm text-amber-800">
                      If you add multiple crawl links, they will all be marked as "pending" and will not overwrite one another.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="include-paths" className="block text-sm font-medium text-gray-700 mb-1">
                        Include only paths
                      </label>
                      <Input
                        id="include-paths"
                        value={includePaths}
                        onChange={(e) => setIncludePaths(e.target.value)}
                        placeholder="Ex: blog/*, dev/*"
                      />
                    </div>
                    <div>
                      <label htmlFor="exclude-paths" className="block text-sm font-medium text-gray-700 mb-1">
                        Exclude paths
                      </label>
                      <Input
                        id="exclude-paths"
                        value={excludePaths}
                        onChange={(e) => setExcludePaths(e.target.value)}
                        placeholder="Ex: blog/*, dev/*"
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <Button onClick={handleFetchLinks} className="bg-gray-800 hover:bg-gray-700">
                      Fetch links
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sitemap" className="mt-4">
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Upload your sitemap XML file or provide a URL to your sitemap.
                  </p>
                  <Input
                    placeholder="https://example.com/sitemap.xml"
                    className="w-full"
                  />
                  <div className="text-right">
                    <Button className="bg-gray-800 hover:bg-gray-700">
                      Upload sitemap
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="individual-link" className="mt-4">
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Add specific links manually.
                  </p>
                  <Input
                    placeholder="https://example.com/page"
                    className="w-full"
                  />
                  <div className="text-right">
                    <Button className="bg-gray-800 hover:bg-gray-700">
                      Add link
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {websites.length > 0 && (
          <div>
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="select-all"
                className="rounded border-gray-300 text-black focus:ring-black mr-2"
              />
              <label htmlFor="select-all" className="text-lg font-medium">
                Link sources
              </label>
            </div>
            
            {websites.map((website) => (
              <div 
                key={website.id} 
                className="flex items-center justify-between py-4 border-b border-gray-200"
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`website-${website.id}`}
                    className="rounded border-gray-300 text-black focus:ring-black mr-4"
                  />
                  <div className="flex items-center">
                    <div className="bg-gray-100 rounded-full p-2 mr-3">
                      <Link className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium">{website.url}</div>
                      <div className="text-sm text-gray-500">
                        Last scraped {website.lastScraped} • {website.size}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal size={18} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight size={18} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsiteTab;
