
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAgentSources } from "@/hooks/useAgentSources";
import { useWebsiteSubmission } from "./websites/useWebsiteSubmission";
import { useRAGServices } from "@/hooks/useRAGServices";
import { AgentSource } from "@/types/rag";
import WebsiteCrawlForm from "./websites/components/WebsiteCrawlForm";
import WebsiteSourcesList from "./websites/components/WebsiteSourcesList";

const WebsiteTab: React.FC = () => {
  const { sources: websiteSources, loading, error, removeSourceFromState, refetch } = useAgentSources('website');
  const { isSubmitting, submitWebsiteSource } = useWebsiteSubmission(refetch);
  const { sources: sourceService } = useRAGServices();
  
  const [activeSubTab, setActiveSubTab] = useState("crawl-links");
  const [url, setUrl] = useState("");
  const [protocol, setProtocol] = useState("https://");
  const [includePaths, setIncludePaths] = useState("");
  const [excludePaths, setExcludePaths] = useState("");
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [stalledSources, setStalledSources] = useState<Set<string>>(new Set());
  
  // Add ref to track ongoing recrawl operations
  const recrawlInProgressRef = useRef<Set<string>>(new Set());

  // Group sources by parent-child relationships
  const parentSources = websiteSources.filter(source => !source.parent_source_id);
  const getChildSources = (parentId: string) => 
    websiteSources.filter(source => source.parent_source_id === parentId);

  // Auto-expand sources that are currently crawling
  useEffect(() => {
    const crawlingSources = parentSources.filter(
      source => source.crawl_status === 'in_progress' || source.crawl_status === 'pending'
    );
    
    if (crawlingSources.length > 0) {
      const newExpandedSources = new Set(expandedSources);
      crawlingSources.forEach(source => {
        newExpandedSources.add(source.id);
      });
      setExpandedSources(newExpandedSources);
    }
  }, [parentSources]);

  // Monitor for stalled crawling processes
  useEffect(() => {
    const crawlingSources = parentSources.filter(
      source => source.crawl_status === 'in_progress'
    );

    crawlingSources.forEach(source => {
      const lastUpdate = source.metadata?.last_progress_update;
      if (lastUpdate) {
        const timeSinceUpdate = Date.now() - new Date(lastUpdate).getTime();
        if (timeSinceUpdate > 45000) { // 45 seconds threshold
          setStalledSources(prev => new Set([...prev, source.id]));
          
          // Auto-restart stalled crawls
          if (timeSinceUpdate > 60000) { // 1 minute
            console.log(`Auto-restarting stalled crawl for source ${source.id}`);
            handleRecrawl(source);
          }
        }
      }
    });
  }, [parentSources]);

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
      
      // If deleting a child source, update parent's links_count
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
  };

  const handleRecrawl = useCallback(async (source: AgentSource) => {
    // Prevent multiple recrawl operations on the same source
    if (recrawlInProgressRef.current.has(source.id)) {
      console.log(`Recrawl already in progress for source ${source.id}`);
      return;
    }

    try {
      // Mark recrawl as in progress
      recrawlInProgressRef.current.add(source.id);

      // Clear stalled status
      setStalledSources(prev => {
        const newSet = new Set(prev);
        newSet.delete(source.id);
        return newSet;
      });

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
      
      // Auto-expand the source that is being recrawled
      setExpandedSources(prev => new Set([...prev, source.id]));
      
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
      // Clear the in-progress flag after a delay to prevent rapid successive calls
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
