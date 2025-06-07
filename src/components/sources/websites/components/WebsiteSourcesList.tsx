
import React, { useCallback, useState, useMemo, useEffect } from 'react';
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

  const { 
    data: paginatedData, 
    refetch, 
    isLoading 
  } = useSourcesPaginated({
    sourceType: 'website',
    page,
    pageSize,
    enabled: !loading
  });

  // Enhanced event listening for all source events including remove/restore
  useEffect(() => {
    const handleSourceCreated = (event: CustomEvent) => {
      const { sourceType } = event.detail;
      if (sourceType === 'website') {
        console.log('🔄 Website source created, refetching list');
        refetch();
      }
    };

    const handleSourceUpdated = () => {
      console.log('🔄 Source updated, refetching list');
      refetch();
    };

    const handleSourceRemoved = (event: CustomEvent) => {
      console.log('🗑️ Source removed (soft delete), refetching list:', event.detail);
      refetch();
    };

    const handleSourceRestored = (event: CustomEvent) => {
      console.log('🔄 Source restored, refetching list:', event.detail);
      refetch();
    };

    const handleCrawlStarted = () => {
      console.log('🔄 Crawl started, refetching list');
      refetch();
    };

    const handleCrawlCompleted = () => {
      console.log('🔄 Crawl completed, refetching list');
      refetch();
    };

    // Add all event listeners
    window.addEventListener('sourceCreated', handleSourceCreated as EventListener);
    window.addEventListener('sourceUpdated', handleSourceUpdated);
    window.addEventListener('sourceRemoved', handleSourceRemoved as EventListener);
    window.addEventListener('sourceRestored', handleSourceRestored as EventListener);
    window.addEventListener('crawlStarted', handleCrawlStarted);
    window.addEventListener('crawlCompleted', handleCrawlCompleted);

    return () => {
      // Clean up all event listeners
      window.removeEventListener('sourceCreated', handleSourceCreated as EventListener);
      window.removeEventListener('sourceUpdated', handleSourceUpdated);
      window.removeEventListener('sourceRemoved', handleSourceRemoved as EventListener);
      window.removeEventListener('sourceRestored', handleSourceRestored as EventListener);
      window.removeEventListener('crawlStarted', handleCrawlStarted);
      window.removeEventListener('crawlCompleted', handleCrawlCompleted);
    };
  }, [refetch]);

  const allSources = paginatedData?.sources || [];

  const parentSources = useMemo(() => {
    console.log('🔍 DEBUG: Processing website sources for list:', {
      totalSources: allSources.length,
      page,
      timestamp: new Date().toISOString()
    });
    
    // Log all sources to see what we have
    console.log('🔍 DEBUG: All sources received:', allSources.map(s => ({
      id: s.id,
      title: s.title,
      url: s.url,
      is_active: s.is_active,
      pending_deletion: s.pending_deletion,
      is_excluded: s.is_excluded,
      parent_source_id: s.parent_source_id,
      source_type: s.source_type
    })));
    
    // Filter for parent sources (no parent_source_id) and include ALL active sources
    // CRITICAL FIX: Include sources with pending_deletion=true in the display
    const parents = allSources.filter(source => {
      const isParent = !source.parent_source_id;
      const isWebsite = source.source_type === 'website';
      const isActive = source.is_active === true;
      // REMOVED the pending_deletion filter - we want to show these sources
      
      console.log(`🔍 DEBUG: Source ${source.id} filter check:`, {
        isParent,
        isWebsite,
        isActive,
        pending_deletion: source.pending_deletion,
        is_excluded: source.is_excluded,
        willInclude: isParent && isWebsite && isActive
      });
      
      return isParent && isWebsite && isActive;
    });
    
    console.log('📊 DEBUG: Final parent website sources:', {
      count: parents.length,
      sources: parents.map(s => ({ 
        id: s.id, 
        title: s.title, 
        url: s.url,
        pending_deletion: s.pending_deletion,
        is_excluded: s.is_excluded
      })),
      timestamp: new Date().toISOString()
    });
    
    return parents;
  }, [allSources, page]);

  const getChildSources = useCallback((parentId: string): AgentSource[] => {
    return allSources.filter(source => source.parent_source_id === parentId);
  }, [allSources]);

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

  if ((loading || isLoading) && !paginatedData) {
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
