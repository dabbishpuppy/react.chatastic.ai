
import React from "react";
import QASourceForm from "@/components/sources/QA/QASourceForm";
import ErrorBoundary from "@/components/sources/ErrorBoundary";
import { useQASourcesPaginated } from "@/hooks/useSourcesPaginated";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import QASourceItem from "./QASourceItem";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash2, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import DeleteSourceDialog from "../DeleteSourceDialog";
import { useSourcesListLogic } from "../hooks/useSourcesListLogic";

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

  const {
    optimisticSources,
    deleteSource,
    isDeleting,
    setDeleteSource,
    handleDeleteClick,
    handleDeleteConfirm,
    handleRowClick,
  } = useSourcesListLogic(sources, () => {
    // Invalidate and refetch the Q&A sources
    queryClient.invalidateQueries({ 
      queryKey: ['sources', agentId, 'qa'] 
    });
    refetch();
  });

  const handleSourceAdded = () => {
    // Invalidate and refetch the Q&A sources when a new one is added
    queryClient.invalidateQueries({ 
      queryKey: ['sources', agentId, 'qa'] 
    });
    refetch();
  };

  if (isLoading && optimisticSources.length === 0) {
    return (
      <ErrorBoundary tabName="Q&A">
        <div className="space-y-6 mt-4">
          <div>
            <h2 className="text-2xl font-semibold">Q&A Training</h2>
            <p className="text-gray-600 mt-1">
              Create custom question and answer pairs to train your AI agent with specific responses.
            </p>
          </div>
          <QASourceForm key={sources.length} />
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="text-gray-500">Loading sources...</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
    );
  }

  if (error) {
    return (
      <ErrorBoundary tabName="Q&A">
        <div className="space-y-6 mt-4">
          <div>
            <h2 className="text-2xl font-semibold">Q&A Training</h2>
            <p className="text-gray-600 mt-1">
              Create custom question and answer pairs to train your AI agent with specific responses.
            </p>
          </div>
          <QASourceForm key={sources.length} />
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-center text-red-500">
                Error: {error.message}
              </div>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
    );
  }

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
          
          {optimisticSources.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Sources ({optimisticSources.length})</h3>
              <div className="space-y-3">
                {optimisticSources.map((source) => (
                  <div key={source.id} className="relative">
                    <div className="absolute left-4 top-4 z-10">
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => {}}
                      />
                    </div>
                    <div className="absolute right-4 top-4 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRowClick(source)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(source)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="pl-10 pr-12">
                      <QASourceItem source={source} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Card className="border border-gray-200">
              <CardContent className="p-6">
                <div className="text-center text-gray-500">
                  <p>No sources found</p>
                  <p className="text-sm mt-1">Add your first source using the form above</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DeleteSourceDialog
          open={!!deleteSource}
          onOpenChange={(open) => !open && setDeleteSource(null)}
          onConfirm={handleDeleteConfirm}
          sourceTitle={deleteSource?.title || ''}
          isDeleting={isDeleting}
        />
      </div>
    </ErrorBoundary>
  );
};

export default QATab;
