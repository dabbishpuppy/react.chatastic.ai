
import React, { useCallback, useState, useMemo } from 'react';
import { AgentSource } from '@/types/rag';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useRAGServices } from '@/hooks/useRAGServices';
import { useSelectionState } from '@/hooks/useSelectionState';
import { usePaginationState } from '@/hooks/usePaginationState';
import { useSourcesPaginated } from '@/hooks/useSourcesPaginated';
import WebsiteSourcesHeader from './WebsiteSourcesHeader';
import WebsiteSourcesContent from './WebsiteSourcesContent';
import WebsiteSourcesLoading from './WebsiteSourcesLoading';
import BulkActionBar from '../../BulkActionBar';
import PaginationControls from '../../PaginationControls';

interface WebsiteSourcesListProps {
  onEdit: (sourceId: string, newUrl: string) => void;
  onExclude: (source: AgentSource) => void;
  onDelete: (source: AgentSource) => void;
  onRecrawl: (source: AgentSource) => void;
  loading: boolean;
  error: string | null;
}

const WebsiteSourcesList: React.FC<WebsiteSourcesListProps> = ({
  onEdit,
  onExclude,
  onDelete,
  onRecrawl,
  loading,
  error
}) => {
  const { sources: sourceService } = useRAGServices();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const {
    selectedArray,
    selectedCount,
    selectAll,
    deselectAll,
    clearSelection,
    isSelected,
    toggleItem
  } = useSelectionState();

  const {
    page,
    pageSize,
    goToFirstPage,
    goToPreviousPage,
    goToNextPage,
    goToLastPage,
    changePageSize
  } = usePaginationState({
    initialPageSize: 25,
    onPageChange: () => clearSelection(),
    onPageSizeChange: () => clearSelection()
  });

  const { data: paginatedData, refetch } = useSourcesPaginated({
    sourceType: 'website',
    page,
    pageSize,
    enabled: !loading
  });

  const parentSources = useMemo(() => {
    const allSources = paginatedData?.sources || [];
    return allSources.filter(source => 
      !source.parent_source_id && 
      source.source_type === 'website'
    );
  }, [paginatedData?.sources]);

  const getChildSources = useCallback((parentId: string): AgentSource[] => {
    return (paginatedData?.sources || []).filter(source => source.parent_source_id === parentId);
  }, [paginatedData?.sources]);

  const currentPageSourceIds = parentSources.map(s => s.id);
  const allCurrentPageSelected = currentPageSourceIds.length > 0 && 
    currentPageSourceIds.every(id => isSelected(id));

  const handleSelectAll = useCallback(() => {
    if (allCurrentPageSelected) {
      deselectAll(currentPageSourceIds);
    } else {
      selectAll(currentPageSourceIds);
    }
  }, [allCurrentPageSelected, currentPageSourceIds, selectAll, deselectAll]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedArray.length === 0) return;

    setIsDeleting(true);
    try {
      await Promise.all(
        selectedArray.map(id => sourceService.deleteSource(id))
      );
      
      toast({
        title: "Success",
        description: `${selectedArray.length} sources deleted successfully`
      });
      
      clearSelection();
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete selected sources",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  }, [selectedArray, sourceService, clearSelection, refetch]);

  const handleBulkRestore = useCallback(async () => {
    if (selectedArray.length === 0) return;

    setIsRestoring(true);
    try {
      await Promise.all(
        selectedArray.map(id => sourceService.updateSource(id, { is_active: true }))
      );
      
      toast({
        title: "Success",
        description: `${selectedArray.length} sources restored successfully`
      });
      
      clearSelection();
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restore selected sources",
        variant: "destructive"
      });
    } finally {
      setIsRestoring(false);
    }
  }, [selectedArray, sourceService, clearSelection, refetch]);

  if (loading && !paginatedData) {
    return <WebsiteSourcesLoading />;
  }

  if (error) {
    return (
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading website sources: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCount = paginatedData?.totalCount || 0;
  const totalPages = paginatedData?.totalPages || 1;

  return (
    <div className="relative">
      <Card className="border border-gray-200">
        <WebsiteSourcesHeader
          sourcesCount={parentSources.length}
          allCurrentPageSelected={allCurrentPageSelected}
          onSelectAll={handleSelectAll}
        />
        <CardContent className="space-y-4">
          <WebsiteSourcesContent
            sources={parentSources}
            getChildSources={getChildSources}
            onEdit={onEdit}
            onExclude={onExclude}
            onDelete={onDelete}
            onRecrawl={onRecrawl}
            isSelected={isSelected}
            toggleItem={toggleItem}
          />

          {paginatedData && totalCount > 0 && (
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalCount}
              onPageChange={() => {}}
              onPageSizeChange={changePageSize}
              onFirstPage={goToFirstPage}
              onPreviousPage={goToPreviousPage}
              onNextPage={() => goToNextPage(totalPages)}
              onLastPage={() => goToLastPage(totalPages)}
            />
          )}
        </CardContent>
      </Card>

      <BulkActionBar
        selectedCount={selectedCount}
        onDelete={handleBulkDelete}
        onRestore={handleBulkRestore}
        isDeleting={isDeleting}
        isRestoring={isRestoring}
      />
    </div>
  );
};

export default WebsiteSourcesList;
