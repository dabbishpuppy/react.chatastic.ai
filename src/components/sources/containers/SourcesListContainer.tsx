
import React from 'react';
import { useSourcesPaginated } from '@/hooks/useSourcesPaginated';
import { useSelectionState } from '@/hooks/useSelectionState';
import SourcesListView from '../views/SourcesListView';
import { useSourcesActions } from '../hooks/useSourcesActions';
import { SourceType } from '@/types/rag';

interface SourcesListContainerProps {
  sourceType?: SourceType;
  pageSize?: number;
}

const SourcesListContainer: React.FC<SourcesListContainerProps> = ({
  sourceType,
  pageSize = 25
}) => {
  const { 
    data,
    isLoading,
    error,
    refetch 
  } = useSourcesPaginated({
    sourceType,
    page: 1,
    pageSize
  });

  const sources = data?.sources || [];
  const hasMore = data ? data.currentPage < data.totalPages : false;
  
  const {
    selectedArray: selectedItems,
    selectedCount,
    toggleItem: toggleSelection,
    selectAll,
    deselectAll,
    clearSelection
  } = useSelectionState();

  const isAllSelected = selectedCount > 0 && selectedCount === sources.length;
  
  const toggleSelectAll = () => {
    if (isAllSelected) {
      deselectAll();
    } else {
      selectAll(sources.map(s => s.id));
    }
  };

  const {
    handleEdit,
    handleDelete,
    handleBulkDelete,
    isDeleting
  } = useSourcesActions(refetch);

  const handleSourceDeleted = (sourceId: string) => {
    clearSelection();
    refetch();
  };

  const loadMore = () => {
    // Implementation for loading more sources if needed
    console.log('Load more not implemented in this container');
  };

  return (
    <SourcesListView
      sources={sources}
      loading={isLoading}
      error={error?.message || null}
      hasMore={hasMore}
      isLoadingMore={false}
      selectedItems={selectedItems}
      isAllSelected={isAllSelected}
      onLoadMore={loadMore}
      onToggleSelection={toggleSelection}
      onToggleSelectAll={toggleSelectAll}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onBulkDelete={handleBulkDelete}
      onSourceDeleted={handleSourceDeleted}
      isDeleting={isDeleting}
    />
  );
};

export default SourcesListContainer;
