
import React from "react";
import QASourceForm from "@/components/sources/QA/QASourceForm";
import SourcesListPaginated from "@/components/sources/SourcesListPaginated";
import ErrorBoundary from "@/components/sources/ErrorBoundary";
import { useQASourcesPaginated } from "@/hooks/useSourcesPaginated";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const QATab: React.FC = () => {
  const {
    data: paginatedData,
    isLoading,
    error
  } = useQASourcesPaginated(1, 25);

  const sources = paginatedData?.sources || [];

  return (
    <ErrorBoundary tabName="Q&A">
      <div className="space-y-6 mt-4">
        <div>
          <h2 className="text-2xl font-semibold">Q&A Training</h2>
        </div>

        <div className="space-y-4">
          <QASourceForm />
          
          <Card className="border border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Q&A Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <SourcesListPaginated
                sources={sources}
                loading={isLoading}
                error={error?.message || null}
                onSourceDeleted={(sourceId) => {
                  // Handle source deletion if needed
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default QATab;
