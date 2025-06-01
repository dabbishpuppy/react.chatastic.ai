
import React from 'react';
import { AgentSource } from '@/types/rag';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, Trash } from 'lucide-react';
import SourceTableRow from '../components/SourceTableRow';
import BulkActionBar from '../BulkActionBar';

interface SourcesListViewProps {
  sources: AgentSource[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  selectedItems: string[];
  isAllSelected: boolean;
  onLoadMore: () => void;
  onToggleSelection: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit?: (sourceId: string, newValue: string) => void;
  onDelete?: (source: AgentSource) => void;
  onBulkDelete?: (sourceIds: string[]) => void;
  onSourceDeleted?: (sourceId: string) => void;
  isDeleting?: boolean;
}

const SourcesListView: React.FC<SourcesListViewProps> = ({
  sources,
  loading,
  error,
  hasMore,
  isLoadingMore,
  selectedItems,
  isAllSelected,
  onLoadMore,
  onToggleSelection,
  onToggleSelectAll,
  onEdit,
  onDelete,
  onBulkDelete,
  onSourceDeleted,
  isDeleting = false
}) => {
  if (loading && sources.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <div className="text-gray-500">Loading sources...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center text-red-500">
          Error: {error}
        </div>
      </Card>
    );
  }

  if (sources.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <p>No sources found</p>
          <p className="text-sm mt-1">Add your first source using the form above</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Sources ({sources.length})</h3>
        {selectedItems.length > 0 && onBulkDelete && (
          <BulkActionBar
            selectedCount={selectedItems.length}
            onDelete={() => onBulkDelete(selectedItems)}
            onRestore={() => {}} // Not implemented in this context
            isDeleting={isDeleting}
          />
        )}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={onToggleSelectAll}
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
            {sources.map((source) => (
              <SourceTableRow
                key={source.id}
                source={source}
                onToggleSelection={() => onToggleSelection(source.id)}
                onRowClick={() => {}}
                onDeleteClick={onDelete ? () => onDelete(source) : undefined}
                onNavigateClick={() => {}}
              />
            ))}
          </TableBody>
        </Table>
      </Card>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="min-w-32"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default SourcesListView;
