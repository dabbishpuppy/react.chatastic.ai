
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface CrawlProgressStatsProps {
  progress: number;
  completedJobs: number;
  failedJobs: number;
  totalJobs: number;
}

const CrawlProgressStats: React.FC<CrawlProgressStatsProps> = ({
  progress,
  completedJobs,
  failedJobs,
  totalJobs
}) => {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Progress</span>
          <span>{completedJobs + failedJobs} / {totalJobs}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-green-600">{completedJobs}</div>
          <div className="text-xs text-muted-foreground">Completed</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-red-600">{failedJobs}</div>
          <div className="text-xs text-muted-foreground">Failed</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-600">{totalJobs - completedJobs - failedJobs}</div>
          <div className="text-xs text-muted-foreground">Pending</div>
        </div>
      </div>
    </div>
  );
};

export default CrawlProgressStats;
