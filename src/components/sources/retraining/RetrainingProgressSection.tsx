
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface RetrainingProgressSectionProps {
  status: 'idle' | 'training' | 'completed' | 'failed';
  progressPercentage: number;
  processedCount: number;
  totalCount: number;
  currentlyProcessing?: string[];
}

export const RetrainingProgressSection: React.FC<RetrainingProgressSectionProps> = ({
  status,
  progressPercentage,
  processedCount,
  totalCount,
  currentlyProcessing = []
}) => {
  const isTrainingActive = status === 'training';
  const isTrainingCompleted = status === 'completed';
  const isTrainingFailed = status === 'failed';

  if (!isTrainingActive && !isTrainingCompleted && !isTrainingFailed) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>{progressPercentage}%</span>
        </div>
        <Progress 
          value={progressPercentage} 
          className={`w-full ${isTrainingFailed ? 'bg-red-100' : ''}`}
        />
      </div>

      <div className="text-sm text-muted-foreground">
        {processedCount} of {totalCount} items processed
      </div>

      {isTrainingActive && currentlyProcessing.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Currently processing:</div>
          <div className="text-xs text-gray-600 max-h-20 overflow-y-auto">
            {currentlyProcessing.map((item: string, index: number) => (
              <div key={index} className="truncate">• {item}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
