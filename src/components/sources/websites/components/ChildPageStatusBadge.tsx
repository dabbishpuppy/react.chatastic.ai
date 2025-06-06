
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { getStatusColor, getStatusText } from '../utils/childPageUtils';

interface ChildPageStatusBadgeProps {
  status: string;
  isLoading: boolean;
}

const ChildPageStatusBadge: React.FC<ChildPageStatusBadgeProps> = ({
  status,
  isLoading
}) => {
  return (
    <Badge className={`${getStatusColor(status)} text-xs px-2 py-0 flex items-center gap-1`}>
      {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
      {getStatusText(status)}
    </Badge>
  );
};

export default ChildPageStatusBadge;
