
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EyeOff } from 'lucide-react';

interface WebsiteSourceStatusBadgesProps {
  crawlStatus: string;
  isExcluded: boolean;
  linksCount: number;
  progress?: number;
}

const WebsiteSourceStatusBadges: React.FC<WebsiteSourceStatusBadgesProps> = ({
  crawlStatus,
  isExcluded,
  linksCount,
  progress
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Badge 
          variant="outline" 
          className={`${getStatusColor(crawlStatus)} text-white`}
        >
          {getStatusText(crawlStatus)}
        </Badge>
        
        {isExcluded && (
          <Badge variant="secondary">
            <EyeOff className="w-3 h-3 mr-1" />
            Excluded
          </Badge>
        )}
        
        {linksCount > 0 && (
          <Badge variant="outline">
            {linksCount} links
          </Badge>
        )}
      </div>
      
      {progress && progress > 0 && progress < 100 && (
        <div>
          <Progress value={progress} className="w-full h-2" />
          <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
        </div>
      )}
    </div>
  );
};

export default WebsiteSourceStatusBadges;
