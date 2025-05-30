
import React from 'react';
import { Button } from '@/components/ui/button';
import { AgentSource } from '@/types/rag';
import SourcesList from './SourcesList';
import { Skeleton } from '@/components/ui/skeleton';

interface SourcesListPaginatedProps {
  sources: AgentSource[];
  loading: boolean;
  error: string | null;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onSourceDeleted: (sourceId: string) => void;
}

const SourcesListPaginated: React.FC<SourcesListPaginatedProps> = ({
  sources,
  loading,
  error,
  onLoadMore,
  hasMore,
  isLoadingMore,
  onSourceDeleted
}) => {
  if (loading && sources.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Sources</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SourcesList 
        sources={sources}
        loading={false} // We handle loading state above
        error={error}
        onSourceDeleted={onSourceDeleted}
      />
      
      {hasMore && !loading && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="min-w-32"
          >
            {isLoadingMore ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
      
      {isLoadingMore && (
        <div className="flex justify-center py-4">
          <div className="text-sm text-gray-500">Loading more sources...</div>
        </div>
      )}
    </div>
  );
};

export default SourcesListPaginated;
