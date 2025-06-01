
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, RefreshCw, Clock } from 'lucide-react';

interface CrawlStatusBadgeProps {
  status: string;
}

const CrawlStatusBadge: React.FC<CrawlStatusBadgeProps> = ({ status }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {getStatusIcon(status)}
      <Badge className={getStatusColor(status)}>
        {status}
      </Badge>
    </div>
  );
};

export default CrawlStatusBadge;
