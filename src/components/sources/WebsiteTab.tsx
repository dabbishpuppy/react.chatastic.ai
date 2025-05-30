
import React, { useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { useWebsiteSubmission } from "./websites/useWebsiteSubmission";
import { useWebsiteFormState } from "./websites/hooks/useWebsiteFormState";
import { useWebsiteSourceOperations } from "./websites/hooks/useWebsiteSourceOperations";
import WebsiteFormSection from "./websites/components/WebsiteFormSection";
import WebsiteSourcesListOptimized from "./websites/components/WebsiteSourcesListOptimized";
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

    console.log('🚀 Website crawl submission started:', {
      url,
      crawlType,
      options,
      timestamp: new Date().toISOString()
    });

    // Combine protocol with domain
    const fullUrl = protocol + url.replace(/^https?:\/\//, '');

    // Parse include and exclude paths
    const parsePathsString = (pathsString: string): string[] => {
      if (!pathsString || pathsString.trim() === '') return [];
      return pathsString
        .split(',')
        .map(path => path.trim())
        .filter(path => path.length > 0);
    };

    const submissionData = {
      url: fullUrl,
      includePaths: parsePathsString(includePaths),
      excludePaths: parsePathsString(excludePaths),
      crawlType,
      ...options
    };

    console.log('📝 Parsed submission data:', submissionData);

    const result = await submitWebsiteSource(submissionData);

    if (result) {
      console.log('✅ Website source created successfully:', {
        sourceId: result.id,
        status: result.crawl_status,
        timestamp: new Date().toISOString()
      });
      
      clearForm();
      refetch();
      
      toast({
        title: "Success",
        description: "Website crawl has been started and will appear in the list below",
      });
    } else {
      console.error('❌ Website source creation failed');
      toast({
        title: "Error",
        description: "Failed to start website crawl",
        variant: "destructive"
      });
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

        <WebsiteSourcesListOptimized
          onEdit={handleEdit}
          onExclude={handleExclude}
          onDelete={handleDelete}
          onRecrawl={handleRecrawl}
          loading={isSubmitting}
          error={null}
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
