
import React from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { AgentSource } from '@/types/rag';
import DeleteSourceDialog from './DeleteSourceDialog';
import SourceTableRow from './components/SourceTableRow';
import { useSourcesListLogic } from './hooks/useSourcesListLogic';

interface SourcesListProps {
  sources: AgentSource[];
  loading: boolean;
  error: string | null;
  onSourceDeleted?: (sourceId: string) => void;
}

const SourcesList: React.FC<SourcesListProps> = ({ 
  sources, 
  loading, 
  error, 
  onSourceDeleted 
}) => {
  const {
    optimisticSources,
    deleteSource,
    isDeleting,
    setDeleteSource,
    handleDeleteClick,
    handleDeleteConfirm,
    handleRowClick,
  } = useSourcesListLogic(sources, onSourceDeleted);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
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

  if (optimisticSources.length === 0) {
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
            {optimisticSources.map((source) => (
              <SourceTableRow
                key={source.id}
                source={source}
                isSelected={false}
                onSelect={() => {}}
                onDelete={handleDeleteClick}
                onView={handleRowClick}
              />
            ))}
          </TableBody>
        </Table>
      </Card>

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

export default SourcesList;
