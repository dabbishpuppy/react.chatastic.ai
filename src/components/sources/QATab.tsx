
import React from "react";
import QASourceForm from "@/components/sources/QA/QASourceForm";
import ErrorBoundary from "@/components/sources/ErrorBoundary";
import { useQASourcesPaginated } from "@/hooks/useSourcesPaginated";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash2, Eye, ArrowRight, MessageSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import DeleteSourceDialog from "./DeleteSourceDialog";
import { useSourcesListLogic } from "./hooks/useSourcesListLogic";
import { formatFileSize } from "./components/SourceSizeFormatter";

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
  } = useSourcesListLogic(sources, (sourceId) => {
    console.log('🗑️ Source deleted in QATab:', sourceId);
    
    // Invalidate and refetch QA sources when a source is deleted
    queryClient.invalidateQueries({ queryKey: ['sources'] });
    queryClient.invalidateQueries({ queryKey: ['sources', agentId] });
    queryClient.invalidateQueries({ queryKey: ['sources', agentId, 'qa'] });
    
    // Force refetch the current data
    refetch();
  });

  // Set up real-time subscription for source changes
  React.useEffect(() => {
    if (!agentId) return;

    const intervalId = setInterval(() => {
      // Refetch data every 2 seconds to catch any changes
      refetch();
    }, 2000);

    return () => clearInterval(intervalId);
  }, [agentId, refetch]);

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
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={false}
                          onCheckedChange={() => {}}
                          aria-label="Select all sources"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {optimisticSources.map((source) => {
                      const question = source.metadata?.question || 'No question available';
                      const questionPreview = question.length > 50 ? question.substring(0, 50) + '...' : question;
                      
                      return (
                        <TableRow key={source.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleRowClick(source)}>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={false}
                              onCheckedChange={() => {}}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <MessageSquare size={16} className="text-blue-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {source.title}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {questionPreview}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              Q&A
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {formatFileSize(source)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRowClick(source)}
                                className="h-8 w-8 p-0"
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
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
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
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
