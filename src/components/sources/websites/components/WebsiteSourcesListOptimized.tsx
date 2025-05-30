import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { AgentSource } from '@/types/rag';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useRAGServices } from '@/hooks/useRAGServices';
import { useSelectionState } from '@/hooks/useSelectionState';
import { usePaginationState } from '@/hooks/usePaginationState';
import { useSourcesPaginated } from '@/hooks/useSourcesPaginated';
import WebsiteSourceItem from '../WebsiteSourceItem';
import BulkActionBar from '../../BulkActionBar';
import PaginationControls from '../../PaginationControls';

interface WebsiteSourcesListOptimizedProps {
  onEdit: (sourceId: string, newUrl: string) => void;
  onExclude: (source: AgentSource) => void;
  onDelete: (source: AgentSource) => void;
  onRecrawl: (source: AgentSource) => void;
  loading: boolean;
  error: string | null;
}

const WebsiteSourcesListOptimized: React.FC<WebsiteSourcesListOptimizedProps> = ({
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

  // Enhanced logging for debugging the display issue
  useEffect(() => {
    console.log('🐛 WebsiteSourcesList Debug Info:', {
      loading,
      error,
      timestamp: new Date().toISOString()
    });
  }, [loading, error]);

  // Selection state
  const {
    selectedArray,
    selectedCount,
    selectAll,
    deselectAll,
    clearSelection,
    isSelected,
    toggleItem
  } = useSelectionState();

  // Pagination state
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

  // Get paginated data with optimized query
  const { data: paginatedData, refetch, isLoading, error: queryError } = useSourcesPaginated({
    sourceType: 'website',
    page,
    pageSize,
    enabled: !loading
  });

  // Separate parent sources and all sources
  const { parentSources, allSources, parentCount } = useMemo(() => {
    const allSources = paginatedData?.sources || [];
    
    console.log('🔍 Processing optimized website sources:', {
      totalFetched: allSources.length,
      page,
      timestamp: new Date().toISOString()
    });
    
    const parents = allSources.filter(source => 
      !source.parent_source_id && 
      source.source_type === 'website' &&
      source.is_active === true
    );
    
    console.log('📊 Parent sources on this page:', {
      parentCount: parents.length,
      totalPages: paginatedData?.totalPages || 0,
      currentPage: page,
      timestamp: new Date().toISOString()
    });
    
    return {
      parentSources: parents,
      allSources,
      parentCount: parents.length
    };
  }, [paginatedData?.sources, page]);

  const getChildSources = useCallback((parentId: string): AgentSource[] => {
    const children = allSources.filter(source => source.parent_source_id === parentId);
    console.log(`👶 Child sources for parent ${parentId}:`, {
      count: children.length,
      timestamp: new Date().toISOString()
    });
    return children;
  }, [allSources]);

  const currentPageSourceIds = parentSources.map(s => s.id);
  const allCurrentPageSelected = currentPageSourceIds.length > 0 && 
    currentPageSourceIds.every(id => isSelected(id));

  const handleSelectAll = useCallback(() => {
    console.log('✅ Select all toggled:', {
      allSelected: allCurrentPageSelected,
      sourceCount: currentPageSourceIds.length,
      timestamp: new Date().toISOString()
    });
    
    if (allCurrentPageSelected) {
      deselectAll(currentPageSourceIds);
    } else {
      selectAll(currentPageSourceIds);
    }
  }, [allCurrentPageSelected, currentPageSourceIds, selectAll, deselectAll]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedArray.length === 0) return;

    console.log('🗑️ Starting bulk delete:', {
      count: selectedArray.length,
      sourceIds: selectedArray,
      timestamp: new Date().toISOString()
    });

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
      
      console.log('✅ Bulk delete completed successfully', {
        deletedCount: selectedArray.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Bulk delete failed:', error);
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

    console.log('🔄 Starting bulk restore:', {
      count: selectedArray.length,
      sourceIds: selectedArray,
      timestamp: new Date().toISOString()
    });

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
      
      console.log('✅ Bulk restore completed successfully', {
        restoredCount: selectedArray.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Bulk restore failed:', error);
      toast({
        title: "Error",
        description: "Failed to restore selected sources",
        variant: "destructive"
      });
    } finally {
      setIsRestoring(false);
    }
  }, [selectedArray, sourceService, clearSelection, refetch]);

  // Show loading state
  if ((loading || isLoading) && !paginatedData) {
    console.log('⏳ Showing loading state');
    return (
      <Card className="border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Website Sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <Skeleton className="h-4 w-4 mr-4" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20 ml-4" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error || queryError) {
    const errorMessage = error || queryError?.message || 'Unknown error';
    console.error('❌ Error state in WebsiteSourcesList:', errorMessage);
    return (
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading website sources: {errorMessage}</p>
            {errorMessage.includes('timeout') && (
              <p className="text-sm mt-2 text-gray-600">
                The query took too long to complete. Please try again.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPages = paginatedData?.totalPages || 1;

  console.log('🎯 Final render state:', {
    parentSourcesCount: parentSources.length,
    totalPages,
    currentPage: page,
    hasData: !!paginatedData,
    timestamp: new Date().toISOString()
  });

  return (
    <div className="relative">
      <Card className="border border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Website Sources (Page {page} of {totalPages})
            </CardTitle>
            {parentSources.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allCurrentPageSelected}
                    onCheckedChange={handleSelectAll}
                    aria-controls="website-sources-list"
                  />
                  <label className="text-sm text-gray-600">
                    Select all
                  </label>
                </div>
                {allCurrentPageSelected && parentSources.length > 0 && (
                  <span className="text-sm text-blue-600">
                    All {parentSources.length} items on this page are selected
                  </span>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div id="website-sources-list" role="list">
            {parentSources.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No website crawl jobs found on this page</p>
                <p className="text-sm">Add a website URL above to get started</p>
              </div>
            ) : (
              parentSources.map((source) => (
                <WebsiteSourceItem
                  key={source.id}
                  source={source}
                  childSources={getChildSources(source.id)}
                  onEdit={onEdit}
                  onExclude={onExclude}
                  onDelete={onDelete}
                  onRecrawl={onRecrawl}
                  isSelected={isSelected(source.id)}
                  onSelectionChange={(selected) => {
                    toggleItem(source.id);
                  }}
                />
              ))
            )}
          </div>

          {totalPages > 1 && (
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={paginatedData?.totalCount || 0}
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

export default WebsiteSourcesListOptimized;
