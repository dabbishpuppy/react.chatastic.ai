
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Info } from "lucide-react";
import { useAgentSources } from "@/hooks/useAgentSources";
import { useWebsiteSubmission } from "./websites/useWebsiteSubmission";
import WebsiteSourceItem from "./websites/WebsiteSourceItem";
import { useRAGServices } from "@/hooks/useRAGServices";
import { AgentSource } from "@/types/rag";

const WebsiteTab: React.FC = () => {
  const { sources: websiteSources, loading, error, removeSourceFromState, refetch } = useAgentSources('website');
  const { isSubmitting, submitWebsiteSource } = useWebsiteSubmission(refetch);
  const { sources: sourceService } = useRAGServices();
  
  const [activeSubTab, setActiveSubTab] = useState("crawl-links");
  const [url, setUrl] = useState("");
  const [includePaths, setIncludePaths] = useState("");
  const [excludePaths, setExcludePaths] = useState("");

  // Group sources by parent-child relationships
  const parentSources = websiteSources.filter(source => !source.parent_source_id);
  const getChildSources = (parentId: string) => 
    websiteSources.filter(source => source.parent_source_id === parentId);

  const handleSubmit = async (crawlType: 'crawl-links' | 'sitemap' | 'individual-link') => {
    if (!url) {
      toast({
        title: "URL required",
        description: "Please enter a URL",
        variant: "destructive"
      });
      return;
    }

    const result = await submitWebsiteSource({
      url,
      includePaths,
      excludePaths,
      crawlType
    });

    if (result) {
      // Clear form on success
      setUrl("");
      setIncludePaths("");
      setExcludePaths("");
    }
  };

  const handleEdit = (source: AgentSource) => {
    // TODO: Implement edit functionality
    toast({
      title: "Edit functionality",
      description: "Edit functionality will be implemented soon"
    });
  };

  const handleExclude = async (source: AgentSource) => {
    try {
      await sourceService.updateSource(source.id, {
        is_excluded: !source.is_excluded
      });
      
      toast({
        title: "Success",
        description: `Link ${source.is_excluded ? 'included' : 'excluded'} successfully`
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update link status",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (source: AgentSource) => {
    try {
      await sourceService.deleteSource(source.id);
      removeSourceFromState(source.id);
      
      toast({
        title: "Success",
        description: "Source deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete source",
        variant: "destructive"
      });
    }
  };

  const handleRecrawl = async (source: AgentSource) => {
    try {
      await sourceService.updateSource(source.id, {
        crawl_status: 'pending',
        progress: 0,
        last_crawled_at: new Date().toISOString()
      });
      
      toast({
        title: "Recrawl initiated",
        description: "The website will be recrawled shortly"
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate recrawl",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 mt-4">
        <div>
          <h2 className="text-2xl font-semibold">Website Training</h2>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-500">Loading website sources...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      <div>
        <h2 className="text-2xl font-semibold">Website Training</h2>
      </div>

      <div className="space-y-4">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">Link</h3>
            
            <Tabs defaultValue="crawl-links" value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
              <TabsList className="mb-6 bg-transparent p-0 border-b border-gray-200 w-full flex space-x-6">
                <TabsTrigger value="crawl-links" className="rounded-none px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none font-medium">
                  Crawl links
                </TabsTrigger>
                <TabsTrigger value="sitemap" className="rounded-none px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none font-medium">
                  Sitemap
                </TabsTrigger>
                <TabsTrigger value="individual-link" className="rounded-none px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:shadow-none font-medium">
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
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4" />
                          </svg>
                        </div>
                      </div>
                      <Input 
                        id="url" 
                        value={url} 
                        onChange={e => setUrl(e.target.value)} 
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
                        onChange={e => setIncludePaths(e.target.value)} 
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
                        onChange={e => setExcludePaths(e.target.value)} 
                        placeholder="Ex: blog/*, dev/*" 
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <Button 
                      onClick={() => handleSubmit('crawl-links')} 
                      className="bg-gray-800 hover:bg-gray-700"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Processing...' : 'Fetch links'}
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
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                  />
                  <div className="text-right">
                    <Button 
                      className="bg-gray-800 hover:bg-gray-700"
                      onClick={() => handleSubmit('sitemap')}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Processing...' : 'Upload sitemap'}
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
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                  />
                  <div className="text-right">
                    <Button 
                      className="bg-gray-800 hover:bg-gray-700"
                      onClick={() => handleSubmit('individual-link')}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Processing...' : 'Add link'}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Website Sources List */}
        {parentSources.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center mb-3">
              <input type="checkbox" id="select-all" className="rounded border-gray-300 text-black focus:ring-black mr-2" />
              <label htmlFor="select-all" className="text-lg font-medium">
                Link sources ({parentSources.length})
              </label>
            </div>
            
            <div className="space-y-3">
              {parentSources.map(source => (
                <WebsiteSourceItem
                  key={source.id}
                  source={source}
                  childSources={getChildSources(source.id)}
                  onEdit={handleEdit}
                  onExclude={handleExclude}
                  onDelete={handleDelete}
                  onRecrawl={handleRecrawl}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-red-500 p-4">
            Error loading website sources: {error}
          </div>
        )}

        {!loading && parentSources.length === 0 && (
          <div className="text-center text-gray-500 p-8">
            <p>No website sources found</p>
            <p className="text-sm mt-1">Add your first website source using the form above</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsiteTab;
