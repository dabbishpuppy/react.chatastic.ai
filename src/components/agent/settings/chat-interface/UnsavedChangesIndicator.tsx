
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface UnsavedChangesIndicatorProps {
  hasUnsavedChanges: boolean;
  onDiscard: () => void;
}

const UnsavedChangesIndicator: React.FC<UnsavedChangesIndicatorProps> = ({
  hasUnsavedChanges,
  onDiscard
}) => {
  if (!hasUnsavedChanges) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
        <div className="flex-1">
          <p className="text-sm font-medium text-yellow-800">
            You have unsaved changes
          </p>
          <p className="text-sm text-yellow-700">
            Your changes are visible in the preview but haven't been saved yet.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onDiscard}
          className="ml-2"
        >
          Discard
        </Button>
      </div>
    </div>
  );
};

export default UnsavedChangesIndicator;
