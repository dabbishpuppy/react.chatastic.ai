
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface WebsiteSourceStatusProps {
  status?: string;
  progress?: number;
  showProgressBar?: boolean;
}

const WebsiteSourceStatus: React.FC<WebsiteSourceStatusProps> = ({
  status,
  progress,
  showProgressBar = false
}) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'Crawling in-progress';
      case 'failed': return 'Failed';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  const isCrawling = status === 'in_progress' || status === 'pending';

  return (
    <div className="flex items-center gap-2">
      <Badge className={getStatusColor(status)}>
        {isCrawling && (
          <Loader2 size={14} className="mr-1 animate-spin" />
        )}
        {getStatusText(status)}
      </Badge>
      
      {showProgressBar && status === 'in_progress' && progress && (
        <div className="w-20 bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default WebsiteSourceStatus;
