
import React, { useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { useWebsiteSubmission } from "./websites/useWebsiteSubmission";
import { useWebsiteFormState } from "./websites/hooks/useWebsiteFormState";
import { useWebsiteSourceOperations } from "./websites/hooks/useWebsiteSourceOperations";
import WebsiteFormSection from "./websites/components/WebsiteFormSection";
import WebsiteSourcesList from "./websites/components/WebsiteSourcesList";
import WebsiteEmptyState from "./websites/components/WebsiteEmptyState";
import ErrorBoundary from "./ErrorBoundary";
import { useSourcesPaginated } from "@/hooks/useSourcesPaginated";

const WebsiteTabContent: React.FC = () => {
  const { isSubmitting, submitWebsiteSource } = useWebsiteSubmission();
  
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

  const { refetch } = useSourcesPaginated({
    sourceType: 'website',
    page: 1,
    pageSize: 25
  });

  const { handleEdit, handleExclude, handleDelete, handleRecrawl } = useWebsiteSourceOperations(
    refetch, 
    (sourceId: string) => {
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
      refetch();
    }
  };

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

        <WebsiteSourcesList
          onEdit={handleEdit}
          onExclude={handleExclude}
          onDelete={handleDelete}
          onRecrawl={handleRecrawl}
          loading={isSubmitting}
          error={null}
        />

        <WebsiteEmptyState 
          loading={isSubmitting}
          error={null}
          hasParentSources={false}
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
