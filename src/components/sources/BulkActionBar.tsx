
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, RotateCcw } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onDelete: () => void;
  onRestore: () => void;
  isDeleting?: boolean;
  isRestoring?: boolean;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onDelete,
  onRestore,
  isDeleting = false,
  isRestoring = false
}) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="sticky bottom-0 bg-gray-800 text-white p-4 flex items-center justify-between border-t border-gray-700 z-10">
      <span className="text-sm font-medium">
        {selectedCount} selected
      </span>
      
      <div className="flex gap-3">
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={isDeleting}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
        
        <Button
          variant="default"
          size="sm"
          onClick={onRestore}
          disabled={isRestoring}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          {isRestoring ? 'Restoring...' : 'Restore'}
        </Button>
      </div>
    </div>
  );
};

export default BulkActionBar;
