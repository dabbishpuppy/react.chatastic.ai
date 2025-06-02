
import React from "react";
import QASourceForm from "@/components/sources/QA/QASourceForm";
import SourcesListPaginated from "@/components/sources/SourcesListPaginated";
import ErrorBoundary from "@/components/sources/ErrorBoundary";
import { useQASourcesPaginated } from "@/hooks/useSourcesPaginated";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

const QATab: React.FC = () => {
  const { agentId } = useParams();
  const queryClient = useQueryClient();
  
  const {
    data: paginatedData,
    isLoading,
    error,
    refetch
  } = useQASourcesPaginated(1, 25);

  const sources = paginatedData?.sources || [];

  const handleSourceDeleted = (sourceId: string) => {
    // Invalidate and refetch the Q&A sources
    queryClient.invalidateQueries({ 
      queryKey: ['sources', agentId, 'qa'] 
    });
    refetch();
  };

  const handleSourceAdded = () => {
    // Invalidate and refetch the Q&A sources when a new one is added
    queryClient.invalidateQueries({ 
      queryKey: ['sources', agentId, 'qa'] 
    });
    refetch();
  };

  return (
    <ErrorBoundary tabName="Q&A">
      <div className="space-y-6 mt-4">
        <div>
          <h2 className="text-2xl font-semibold">Q&A Training</h2>
          <p className="text-gray-600 mt-1">
            Create custom question and answer pairs to train your AI agent with specific responses.
          </p>
        </div>

        <div className="space-y-4">
          <QASourceForm key={sources.length} />
          
          <Card className="border border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Q&A Sources ({sources.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <SourcesListPaginated
                sources={sources}
                loading={isLoading}
                error={error?.message || null}
                onSourceDeleted={handleSourceDeleted}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default QATab;
