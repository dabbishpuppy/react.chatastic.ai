
import React, { useState } from 'react';
import { AgentSource } from '@/types/rag';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2 } from 'lucide-react';
import SourceTableRow from './components/SourceTableRow';
import DeleteSourceDialog from './DeleteSourceDialog';
import BulkActionBar from './BulkActionBar';
import { useSourcesListLogic } from './hooks/useSourcesListLogic';
import { useSelectionState } from '@/hooks/useSelectionState';

interface SourcesListPaginatedProps {
  sources: AgentSource[];
  loading?: boolean;
  error?: string | null;
  onSourceDeleted?: (sourceId: string) => void;
}

const SourcesListPaginated: React.FC<SourcesListPaginatedProps> = ({
  sources,
  loading = false,
  error = null,
  onSourceDeleted
}) => {
  const {
    optimisticSources,
    deleteSource,
    isDeleting,
    setDeleteSource,
    handleDeleteClick,
    handleDeleteConfirm,
    handleRowClick
  } = useSourcesListLogic(sources, onSourceDeleted);

  const {
    selectedItems,
    isAllSelected,
    toggleSelectAll,
    toggleItem,
    clearSelection
  } = useSelectionState(optimisticSources.map(s => s.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading sources...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (optimisticSources.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">No sources found</div>
      </div>
    );
  }

  const handleBulkDelete = () => {
    console.log('Bulk delete:', selectedItems);
  };

  const handleBulkRestore = () => {
    console.log('Bulk restore:', selectedItems);
  };

  return (
    <div className="space-y-4">
      {selectedItems.length > 0 && (
        <BulkActionBar
          selectedCount={selectedItems.length}
          onDelete={handleBulkDelete}
          onRestore={handleBulkRestore}
        />
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {optimisticSources.map((source) => (
              <SourceTableRow
                key={source.id}
                source={source}
                isSelected={selectedItems.includes(source.id)}
                onSelect={(selected) => toggleItem(source.id)}
                onDelete={handleDeleteClick}
                onView={handleRowClick}
                onNavigate={handleRowClick}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <DeleteSourceDialog
        open={!!deleteSource}
        onOpenChange={(open) => !open && setDeleteSource(null)}
        onConfirm={handleDeleteConfirm}
        sourceTitle={deleteSource?.title || ''}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default SourcesListPaginated;
