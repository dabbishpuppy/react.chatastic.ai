
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Loader2, GraduationCap } from 'lucide-react';

interface ChildPageStatusBadgeProps {
  status: string;
  isLoading?: boolean;
}

const ChildPageStatusBadge: React.FC<ChildPageStatusBadgeProps> = ({
  status,
  isLoading = false
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'trained':
        return {
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200',
          icon: <GraduationCap className="w-3 h-3 mr-1" />,
          text: 'Trained'
        };
      case 'completed':
        return {
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <CheckCircle className="w-3 h-3 mr-1" />,
          text: 'Crawled'
        };
      case 'in_progress':
      case 'processing':
        return {
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: isLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Clock className="w-3 h-3 mr-1" />,
          text: isLoading ? 'Processing...' : 'In Progress'
        };
      case 'failed':
        return {
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200',
          icon: <AlertCircle className="w-3 h-3 mr-1" />,
          text: 'Failed'
        };
      case 'pending':
      default:
        return {
          variant: 'outline' as const,
          className: 'bg-gray-50 text-gray-600 border-gray-200',
          icon: <Clock className="w-3 h-3 mr-1" />,
          text: 'Pending'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} flex items-center text-xs font-medium`}
    >
      {config.icon}
      {config.text}
    </Badge>
  );
};

export default ChildPageStatusBadge;
