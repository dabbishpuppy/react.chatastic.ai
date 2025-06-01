
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface FailedJobsPanelProps {
  failedJobsCount: number;
  onRetryFailed: () => void;
}

const FailedJobsPanel: React.FC<FailedJobsPanelProps> = ({ failedJobsCount, onRetryFailed }) => {
  if (failedJobsCount === 0) return null;

  return (
    <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-3">
      <div>
        <span className="text-red-700 font-medium">{failedJobsCount} jobs failed</span>
        <p className="text-xs text-red-600">You can retry failed jobs or review individual failures</p>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onRetryFailed}
        className="border-red-200 text-red-700 hover:bg-red-100"
      >
        <RefreshCw className="h-4 w-4 mr-1" />
        Retry Failed
      </Button>
    </div>
  );
};

export default FailedJobsPanel;
