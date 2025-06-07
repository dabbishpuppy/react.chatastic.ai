
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface SizeLimitWarningProps {
  totalSize: number;
  isVisible: boolean;
}

const SizeLimitWarning: React.FC<SizeLimitWarningProps> = ({ totalSize, isVisible }) => {
  if (!isVisible) return null;

  const formatBytes = (bytes: number): string => {
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-orange-900">Size limit reached</p>
          <p className="text-xs text-orange-700">
            You've used {formatBytes(totalSize)} of your 500KB limit. Upgrade to add more sources.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SizeLimitWarning;
