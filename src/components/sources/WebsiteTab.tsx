import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useOptimizedAgentSources } from "@/hooks/useOptimizedAgentSources";
import { useWebsiteSubmission } from "./websites/useWebsiteSubmission";
import { useRAGServices } from "@/hooks/useRAGServices";
import { AgentSource } from "@/types/rag";
import WebsiteCrawlForm from "./websites/components/WebsiteCrawlForm";
import WebsiteSourcesList from "./websites/components/WebsiteSourcesList";

const WebsiteTab: React.FC = () => {
  const { sources: websiteSources, loading, error, removeSourceFromState, refetch } = useOptimizedAgentSources('website');
  const { isSubmitting, submitWebsiteSource } = useWebsiteSubmission(refetch);
  const { sources: sourceService } = useRAGServices();
  
  const [activeSubTab, setActiveSubTab] = useState("crawl-links");
  const [url, setUrl] = useState("");
  const [protocol, setProtocol] = useState("https://");
  const [includePaths, setIncludePaths] = useState("");
  const [excludePaths, setExcludePaths] = useState("");
  
  // Add ref to track ongoing recrawl operations
  const recrawlInProgressRef = useRef<Set<string>>(new Set());

  // Memoized source grouping to prevent unnecessary recalculations
  const parentSources = React.useMemo(() => 
    websiteSources.filter(source => !source.parent_source_id), 
    [websiteSources]
  );
  
  const getChildSources = useCallback((parentId: string) => 
    websiteSources.filter(source => source.parent_source_id === parentId),
    [websiteSources]
  );

  const handleSubmit = async (crawlType: 'crawl-links' | 'sitemap' | 'individual-link', options?: { maxPages?: number; maxDepth?: number; concurrency?: number }) => {
    if (!url) {
      toast({
        title: "URL required",
        description: "Please enter a URL",
        variant: "destructive"
      });
      return;
    }

    // Combine protocol with domain
    const fullUrl = protocol + url.replace(/^https?:\/\//, '');

    const result = await submitWebsiteSource({
      url: fullUrl,
      includePaths,
      excludePaths,
      crawlType,
      ...options
    });

    if (result) {
      // Clear form on success
      setUrl("");
      setIncludePaths("");
      setExcludePaths("");
      setProtocol("https://");
    }
  };

  const handleEdit = useCallback(async (sourceId: string, newUrl: string) => {
    try {
      await sourceService.updateSource(sourceId, {
        url: newUrl,
        title: newUrl
      });
      
      toast({
        title: "Success",
        description: "URL updated successfully"
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update URL",
        variant: "destructive"
      });
    }
  }, [sourceService, refetch]);

  const handleExclude = useCallback(async (source: AgentSource) => {
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
  }, [sourceService, refetch]);

  const handleDelete = useCallback(async (source: AgentSource) => {
    try {
      await sourceService.deleteSource(source.id);
      removeSourceFromState(source.id);
      
      if (source.parent_source_id) {
        const parentSource = parentSources.find(p => p.id === source.parent_source_id);
        if (parentSource) {
          const remainingChildSources = getChildSources(source.parent_source_id).filter(c => c.id !== source.id);
          await sourceService.updateSource(source.parent_source_id, {
            links_count: remainingChildSources.length
          });
        }
      }
      
      toast({
        title: "Success",
        description: "Source deleted successfully"
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete source",
        variant: "destructive"
      });
    }
  }, [sourceService, removeSourceFromState, parentSources, getChildSources, refetch]);

  const handleRecrawl = useCallback(async (source: AgentSource) => {
    if (recrawlInProgressRef.current.has(source.id)) {
      console.log(`Recrawl already in progress for source ${source.id}`);
      return;
    }

    try {
      recrawlInProgressRef.current.add(source.id);

      await sourceService.updateSource(source.id, {
        crawl_status: 'pending',
        progress: 0,
        links_count: 0,
        last_crawled_at: new Date().toISOString(),
        metadata: {
          ...source.metadata,
          last_progress_update: new Date().toISOString(),
          restart_count: (source.metadata?.restart_count || 0) + 1
        }
      });
      
      toast({
        title: "Recrawl initiated",
        description: "The website will be recrawled shortly"
      });
      
      refetch();
    } catch (error) {
      console.error('Recrawl error:', error);
      toast({
        title: "Error",
        description: "Failed to initiate recrawl",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        recrawlInProgressRef.current.delete(source.id);
      }, 2000);
    }
  }, [sourceService, refetch]);

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
                <WebsiteCrawlForm
                  url={url}
                  setUrl={setUrl}
                  protocol={protocol}
                  setProtocol={setProtocol}
                  includePaths={includePaths}
                  setIncludePaths={setIncludePaths}
                  excludePaths={excludePaths}
                  setExcludePaths={setExcludePaths}
                  onSubmit={(options) => handleSubmit('crawl-links', options)}
                  isSubmitting={isSubmitting}
                  buttonText="Fetch links"
                  showFilters={true}
                />
              </TabsContent>

              <TabsContent value="sitemap" className="mt-4">
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Upload your sitemap XML file or provide a URL to your sitemap.
                  </p>
                  <WebsiteCrawlForm
                    url={url}
                    setUrl={setUrl}
                    protocol={protocol}
                    setProtocol={setProtocol}
                    includePaths={includePaths}
                    setIncludePaths={setIncludePaths}
                    excludePaths={excludePaths}
                    setExcludePaths={setExcludePaths}
                    onSubmit={(options) => handleSubmit('sitemap', options)}
                    isSubmitting={isSubmitting}
                    buttonText="Upload sitemap"
                    showFilters={false}
                  />
                </div>
              </TabsContent>

              <TabsContent value="individual-link" className="mt-4">
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Add specific links manually.
                  </p>
                  <WebsiteCrawlForm
                    url={url}
                    setUrl={setUrl}
                    protocol={protocol}
                    setProtocol={setProtocol}
                    includePaths={includePaths}
                    setIncludePaths={setIncludePaths}
                    excludePaths={excludePaths}
                    setExcludePaths={setExcludePaths}
                    onSubmit={(options) => handleSubmit('individual-link', options)}
                    isSubmitting={isSubmitting}
                    buttonText="Add link"
                    showFilters={false}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Website Sources List */}
        {parentSources.length > 0 && (
          <WebsiteSourcesList
            parentSources={parentSources}
            getChildSources={getChildSources}
            onEdit={handleEdit}
            onExclude={handleExclude}
            onDelete={handleDelete}
            onRecrawl={handleRecrawl}
            loading={loading}
            error={error}
          />
        )}

        {!loading && parentSources.length === 0 && !error && (
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
