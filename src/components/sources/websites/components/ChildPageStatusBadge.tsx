
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, GraduationCap, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { getStatusColor, getStatusText } from '../utils/childPageUtils';

interface ChildPageStatusBadgeProps {
  status: string;
  isLoading: boolean;
}

const getStatusIcon = (status: string, isLoading: boolean) => {
  if (isLoading) {
    return <Loader2 className="w-3 h-3 animate-spin" />;
  }

  switch (status) {
    case 'trained':
      return <GraduationCap className="w-3 h-3" />;
    case 'completed':
      return <CheckCircle className="w-3 h-3" />;
    case 'in_progress':
      return <Loader2 className="w-3 h-3 animate-spin" />;
    case 'pending':
      return <Clock className="w-3 h-3" />;
    case 'failed':
      return <AlertTriangle className="w-3 h-3" />;
    default:
      return <Clock className="w-3 h-3" />;
  }
};

const ChildPageStatusBadge: React.FC<ChildPageStatusBadgeProps> = ({
  status,
  isLoading
}) => {
  return (
    <Badge className={`${getStatusColor(status)} text-xs px-2 py-0 flex items-center gap-1`}>
      {getStatusIcon(status, isLoading)}
      {getStatusText(status)}
    </Badge>
  );
};

export default ChildPageStatusBadge;
