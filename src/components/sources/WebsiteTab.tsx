
import React, { useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { useWebsiteSourcesPaginated } from "@/hooks/useSourcesPaginated";
import { useWebsiteSubmission } from "./websites/useWebsiteSubmission";
import { useWebsiteFormState } from "./websites/hooks/useWebsiteFormState";
import { useWebsiteSourceOperations } from "./websites/hooks/useWebsiteSourceOperations";
import WebsiteFormSection from "./websites/components/WebsiteFormSection";
import WebsiteSourcesList from "./websites/components/WebsiteSourcesList";
import WebsiteEmptyState from "./websites/components/WebsiteEmptyState";
import ErrorBoundary from "./ErrorBoundary";

const WebsiteTabContent: React.FC = () => {
  const { 
    data, 
    isLoading, 
    error, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    refetch 
  } = useWebsiteSourcesPaginated();
  
  const { isSubmitting, submitWebsiteSource } = useWebsiteSubmission(refetch);
  
  // Flatten all pages into a single array
  const allSources = data?.pages?.flatMap(page => page.sources) || [];
  
  // Filter for website sources only and create parent/child relationships
  const websiteSources = allSources.filter(source => source.source_type === 'website');
  
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
    (sourceId: string) => {
      // Optimistic update would go here if needed
      refetch();
    }
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

  const loading = isLoading;
  const errorMessage = error?.message || null;

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
            error={errorMessage}
          />
        )}

        {/* Load More Button */}
        {hasNextPage && !loading && (
          <div className="flex justify-center pt-4">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              {isFetchingNextPage ? "Loading..." : "Load More"}
            </button>
          </div>
        )}

        <WebsiteEmptyState 
          loading={loading}
          error={errorMessage}
          hasParentSources={parentSources.length > 0}
        />
      </div>
    </div>
  );
};

const WebsiteTab: React.FC = () => {
  return (
    <ErrorBoundary tabName="Website">
      <WebsiteTabContent />
    </ErrorBoundary>
  );
};

export default WebsiteTab;
