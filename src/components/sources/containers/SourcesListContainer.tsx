
import React from 'react';
import { useSourcesPaginated } from '@/hooks/useSourcesPaginated';
import { useSelectionState } from '@/hooks/useSelectionState';
import SourcesListView from '../views/SourcesListView';
import { useSourcesActions } from '../hooks/useSourcesActions';

interface SourcesListContainerProps {
  sourceType?: string;
  pageSize?: number;
}

const SourcesListContainer: React.FC<SourcesListContainerProps> = ({
  sourceType,
  pageSize = 25
}) => {
  const { 
    sources, 
    loading, 
    error, 
    hasMore, 
    isLoadingMore, 
    loadMore, 
    refetch 
  } = useSourcesPaginated({
    sourceType,
    page: 1,
    pageSize
  });

  const {
    selectedItems,
    isAllSelected,
    toggleSelection,
    toggleSelectAll,
    clearSelection
  } = useSelectionState(sources.map(s => s.id));

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

  return (
    <SourcesListView
      sources={sources}
      loading={loading}
      error={error}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
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
