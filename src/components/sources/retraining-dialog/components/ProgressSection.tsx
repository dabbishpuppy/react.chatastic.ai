
import React from "react";
import { Progress } from "@/components/ui/progress";

interface ProgressSectionProps {
  currentStatus: string;
  currentProgress: number;
  processedCount: number;
  totalCount: number;
  trainingProgress?: any;
}

export const ProgressSection: React.FC<ProgressSectionProps> = ({
  currentStatus,
  currentProgress,
  processedCount,
  totalCount,
  trainingProgress
}) => {
  const isTrainingActive = currentStatus === 'training';
  const isTrainingCompleted = currentStatus === 'completed';
  const isTrainingFailed = currentStatus === 'failed';

  if (!isTrainingActive && !isTrainingCompleted && !isTrainingFailed) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>{currentProgress}%</span>
        </div>
        <Progress 
          value={currentProgress} 
          className={`w-full ${isTrainingFailed ? 'bg-red-100' : ''}`}
        />
      </div>

      <div className="text-sm text-muted-foreground">
        {processedCount} of {totalCount} items processed
      </div>

      {/* Show currently processing items */}
      {isTrainingActive && trainingProgress?.currentlyProcessing && trainingProgress.currentlyProcessing.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Currently processing:</div>
          <div className="text-xs text-gray-600 max-h-20 overflow-y-auto">
            {trainingProgress.currentlyProcessing.map((item: string, index: number) => (
              <div key={index} className="truncate">• {item}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
