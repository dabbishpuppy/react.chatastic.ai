
import React, { useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { useOptimizedAgentSources } from "@/hooks/useOptimizedAgentSources";
import { useWebsiteSubmission } from "./websites/useWebsiteSubmission";
import { useWebsiteFormState } from "./websites/hooks/useWebsiteFormState";
import { useWebsiteSourceOperations } from "./websites/hooks/useWebsiteSourceOperations";
import WebsiteFormSection from "./websites/components/WebsiteFormSection";
import WebsiteSourcesList from "./websites/components/WebsiteSourcesList";
import WebsiteEmptyState from "./websites/components/WebsiteEmptyState";

const WebsiteTab: React.FC = () => {
  const { sources: allSources, loading, error, removeSourceFromState, refetch, getSourcesByType } = useOptimizedAgentSources();
  const { isSubmitting, submitWebsiteSource } = useWebsiteSubmission(refetch);
  
  // Filter for website sources only
  const websiteSources = getSourcesByType('website');
  
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

  // Memoized source grouping to prevent unnecessary recalculations
  const parentSources = React.useMemo(() => 
    websiteSources.filter(source => !source.parent_source_id), 
    [websiteSources]
  );
  
  const getChildSources = useCallback((parentId: string) => 
    websiteSources.filter(source => source.parent_source_id === parentId),
    [websiteSources]
  );

  const { handleEdit, handleExclude, handleDelete, handleRecrawl } = useWebsiteSourceOperations(
    refetch, 
    removeSourceFromState
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
      clearForm();
    }
  };

  const handleDeleteWithDependencies = useCallback(async (source: any) => {
    await handleDelete(source, parentSources, getChildSources);
  }, [handleDelete, parentSources, getChildSources]);

  return (
    <div className="space-y-6 mt-4">
      <div>
        <h2 className="text-2xl font-semibold">Website Training</h2>
      </div>

      <div className="space-y-4">
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

        {/* Website Sources List */}
        {parentSources.length > 0 && (
          <WebsiteSourcesList
            parentSources={parentSources}
            getChildSources={getChildSources}
            onEdit={handleEdit}
            onExclude={handleExclude}
            onDelete={handleDeleteWithDependencies}
            onRecrawl={handleRecrawl}
            loading={loading}
            error={error}
          />
        )}

        <WebsiteEmptyState 
          loading={loading}
          error={error}
          hasParentSources={parentSources.length > 0}
        />
      </div>
    </div>
  );
};

export default WebsiteTab;
