
import React from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import WebsiteSourcesList from "../components/WebsiteSourcesList";
import WebsiteFormSection from "../components/WebsiteFormSection";
import { useWebsiteSourceOperations } from "../hooks/useWebsiteSourceOperations";
import { useWebsiteFormState } from "../hooks/useWebsiteFormState";
import { WebsiteCrawlService } from "@/services/rag/websiteCrawlService";
import { SourceCreateService } from "@/services/rag/operations/SourceCreateService";
import { useOptimizedAgentSources } from "@/hooks/useOptimizedAgentSources";

const WebsiteTabContainer: React.FC = () => {
  const { agentId } = useParams();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { sources } = useOptimizedAgentSources();
  
  const {
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
    clearForm
  } = useWebsiteFormState();
  
  const handleRefetch = () => {
    console.log('Refetch triggered');
    if (agentId) {
      queryClient.invalidateQueries({ queryKey: ['agent-source-stats', agentId] });
      queryClient.invalidateQueries({ queryKey: ['agent-sources-paginated', agentId, 'website'] });
    }
  };
  
  const handleRemoveFromState = (sourceId: string) => {
    console.log('Remove from state:', sourceId);
  };

  const {
    handleEdit,
    handleExclude,
    handleDelete,
    handleRecrawl
  } = useWebsiteSourceOperations(handleRefetch, handleRemoveFromState);

  // Enhanced duplicate check using direct database query
  const checkForDuplicateUrl = async (urlToCheck: string) => {
    if (!agentId) return false;
    
    try {
      const normalizedUrl = urlToCheck.toLowerCase().replace(/\/$/, '');
      
      const { data: existingSources, error } = await supabase
        .from('agent_sources')
        .select('id, url')
        .eq('agent_id', agentId)
        .eq('source_type', 'website')
        .eq('is_active', true)
        .is('parent_source_id', null);

      if (error) {
        console.error('Error checking for duplicates:', error);
        return false;
      }

      return existingSources?.some(source => {
        const existingUrl = source.url?.toLowerCase().replace(/\/$/, '');
        return existingUrl === normalizedUrl;
      }) || false;
    } catch (error) {
      console.error('Error in duplicate check:', error);
      return false;
    }
  };

  const handleSubmit = async (
    crawlType: 'crawl-links' | 'sitemap' | 'individual-link',
    options?: { maxPages?: number; maxDepth?: number; concurrency?: number }
  ) => {
    if (!agentId || !url.trim()) return;

    // Prevent duplicate submissions
    if (isSubmitting) {
      console.log('Submission already in progress, ignoring duplicate request');
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('🚀 Starting website crawl workflow');
      
      const fullUrl = url.startsWith('http') ? url : `${protocol}${url}`;
      
      // Check for duplicate URLs using database query
      const isDuplicate = await checkForDuplicateUrl(fullUrl);
      if (isDuplicate) {
        toast({
          title: "Duplicate URL",
          description: "This URL has already been added to your sources.",
          variant: "destructive",
        });
        return;
      }
      
      // Create the source first with PENDING status
      const source = await SourceCreateService.createSource({
        agent_id: agentId,
        team_id: '', // Will be fetched automatically
        source_type: 'website',
        title: fullUrl,
        url: fullUrl,
        crawl_status: 'pending', // Start with pending status
        progress: 0,
        links_count: 0,
        include_paths: includePaths ? includePaths.split('\n').filter(p => p.trim()) : [],
        exclude_paths: excludePaths ? excludePaths.split('\n').filter(p => p.trim()) : [],
        respect_robots: true,
        max_concurrent_jobs: options?.concurrency || 2,
        metadata: {
          crawl_type: crawlType,
          max_pages: options?.maxPages || 50,
          max_depth: crawlType === 'individual-link' ? 0 : (options?.maxDepth || 3),
          concurrency: options?.concurrency || 2,
          status_history: [{
            status: 'pending',
            timestamp: new Date().toISOString(),
            message: 'Website source created, crawl queued'
          }]
        }
      });

      console.log('✅ Source created with pending status:', source.id);

      // Start the crawl process
      const crawlOptions = {
        maxPages: options?.maxPages || 50,
        maxDepth: crawlType === 'individual-link' ? 0 : (options?.maxDepth || 3),
        concurrency: options?.concurrency || 2,
        includePaths: includePaths ? includePaths.split('\n').filter(p => p.trim()) : [],
        excludePaths: excludePaths ? excludePaths.split('\n').filter(p => p.trim()) : []
      };

      // Start enhanced crawl which will update status to 'in_progress'
      await WebsiteCrawlService.startEnhancedCrawl(
        agentId,
        source.id,
        fullUrl,
        crawlOptions
      );

      toast({
        title: "Crawl Started",
        description: `Started crawling ${fullUrl} with ${crawlType} method. Status will update in real-time.`,
      });

      // Clear form and refresh list
      clearForm();
      handleRefetch();

    } catch (error) {
      console.error('❌ Error starting crawl:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start crawl",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 mt-4">
      <WebsiteFormSection
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        url={url}
        setUrl={setUrl}
        protocol={protocol}
        setProtocol={setProtocol}
        includePaths={includePaths}
        setIncludePaths={setIncludePaths}
        excludePaths={excludePaths}
        setExcludePaths={setExcludePaths}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
      
      <WebsiteSourcesList
        onEdit={handleEdit}
        onExclude={handleExclude}
        onDelete={handleDelete}
        onRecrawl={handleRecrawl}
        loading={false}
        error={null}
      />
    </div>
  );
};

export default WebsiteTabContainer;
