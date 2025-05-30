
import React from 'react';
import { Button } from '@/components/ui/button';
import { AgentSource } from '@/types/rag';
import SourcesList from './SourcesList';

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
  return (
    <div className="space-y-4">
      <SourcesList 
        sources={sources}
        loading={loading}
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
    </div>
  );
};

export default SourcesListPaginated;
