
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { EyeOff, CheckCircle, Loader2, Clock, AlertTriangle, GraduationCap, Bot } from 'lucide-react';

interface WebsiteSourceStatusBadgesProps {
  crawlStatus: string;
  isExcluded: boolean;
  linksCount?: number;
  progress?: number;
}

const WebsiteSourceStatusBadges: React.FC<WebsiteSourceStatusBadgesProps> = ({
  crawlStatus,
  isExcluded,
  linksCount,
  progress
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
      case 'crawled':
        return {
          icon: <Clock className="w-3 h-3 mr-1" />,
          text: 'Ready for Training',
          className: 'bg-orange-500 text-white'
        };
      case 'training':
        return {
          icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" />,
          text: 'Training',
          className: 'bg-blue-600 text-white'
        };
      case 'trained':
        return {
          icon: <GraduationCap className="w-3 h-3 mr-1" />,
          text: 'Trained',
          className: 'bg-purple-600 text-white'
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
          text: 'Pending',  // Default to Pending instead of Unknown
          className: 'bg-yellow-500 text-white'
        };
    }
  };

  const statusConfig = getStatusConfig(crawlStatus);

  return (
    <div className="flex items-center gap-2">
      <Badge className={`${statusConfig.className} flex items-center`}>
        {statusConfig.icon}
        {statusConfig.text}
        {progress !== undefined && progress > 0 && progress < 100 && (
          <span className="ml-1 text-xs">({progress}%)</span>
        )}
      </Badge>
      
      {linksCount !== undefined && linksCount > 0 && (
        <Badge variant="outline" className="bg-gray-100">
          {linksCount} pages
        </Badge>
      )}
      
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
