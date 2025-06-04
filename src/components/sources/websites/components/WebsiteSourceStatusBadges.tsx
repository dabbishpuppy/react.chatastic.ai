
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { EyeOff, CheckCircle, Loader2, Clock, AlertTriangle } from 'lucide-react';

interface WebsiteSourceStatusBadgesProps {
  crawlStatus: string;
  isExcluded: boolean;
  linksCount: number;
  progress?: number;
}

const WebsiteSourceStatusBadges: React.FC<WebsiteSourceStatusBadgesProps> = ({
  crawlStatus,
  isExcluded
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="w-3 h-3 mr-1" />,
          text: 'Pending',
          className: 'bg-yellow-500 text-white'
        };
      case 'in_progress':
        return {
          icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" />,
          text: 'Crawling',
          className: 'bg-blue-500 text-white'
        };
      case 'completed':
        return {
          icon: <CheckCircle className="w-3 h-3 mr-1" />,
          text: 'Completed',
          className: 'bg-green-500 text-white'
        };
      case 'failed':
        return {
          icon: <AlertTriangle className="w-3 h-3 mr-1" />,
          text: 'Failed',
          className: 'bg-red-500 text-white'
        };
      default:
        return {
          icon: <Clock className="w-3 h-3 mr-1" />,
          text: 'Unknown',
          className: 'bg-gray-500 text-white'
        };
    }
  };

  const statusConfig = getStatusConfig(crawlStatus);

  return (
    <div className="flex items-center gap-2">
      <Badge className={`${statusConfig.className} flex items-center`}>
        {statusConfig.icon}
        {statusConfig.text}
      </Badge>
      
      {isExcluded && (
        <Badge variant="secondary">
          <EyeOff className="w-3 h-3 mr-1" />
          Excluded
        </Badge>
      )}
    </div>
  );
};

export default WebsiteSourceStatusBadges;
