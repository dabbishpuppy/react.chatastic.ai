import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTextSourcesPaginated } from "@/hooks/useSourcesPaginated";
import TextSourceForm from "./text/TextSourceForm";
import SourcesListPaginated from "./SourcesListPaginated";
import ErrorBoundary from "./ErrorBoundary";

const TextTab: React.FC = () => {
  const {
    data: paginatedData,
    isLoading,
    error
  } = useTextSourcesPaginated(1, 25);

  const sources = paginatedData?.sources || [];

  return (
    <ErrorBoundary tabName="Text">
      <div className="space-y-6 mt-4">
        <div>
          <h2 className="text-2xl font-semibold">Text Training</h2>
        </div>

        <div className="space-y-4">
          <TextSourceForm />
          
          <SourcesListPaginated
            sources={sources}
            loading={isLoading}
            error={error?.message || null}
            onSourceDeleted={(sourceId) => {
              // Handle source deletion if needed
            }}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default TextTab;
