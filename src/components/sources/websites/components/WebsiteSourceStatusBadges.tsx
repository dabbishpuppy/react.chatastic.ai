
import React from 'react';
import WorkflowStatusBadge from './WorkflowStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff } from 'lucide-react';

interface WebsiteSourceStatusBadgesProps {
  crawlStatus: string;
  isExcluded: boolean;
  linksCount: number;
  sourceId: string;
  source: any;
}

const WebsiteSourceStatusBadges: React.FC<WebsiteSourceStatusBadgesProps> = ({
  crawlStatus,
  isExcluded,
  linksCount,
  sourceId,
  source
}) => {
  return (
    <div className="flex items-center gap-2">
      <WorkflowStatusBadge
        status={crawlStatus}
        workflowStatus={source?.workflow_status}
        showProgress={crawlStatus === 'in_progress' || crawlStatus === 'CRAWLING'}
        progress={source?.progress}
      />
      
      {isExcluded && (
        <Badge className="bg-gray-100 text-gray-600 border-gray-200 flex items-center gap-1">
          <EyeOff size={12} />
          Excluded
        </Badge>
      )}
    </div>
  );
};

export default WebsiteSourceStatusBadges;
