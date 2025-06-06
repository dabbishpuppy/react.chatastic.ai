
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { getStatusColor, getStatusText } from '../utils/childPageUtils';

interface ChildPageStatusBadgeProps {
  displayStatus: string;
}

const ChildPageStatusBadge: React.FC<ChildPageStatusBadgeProps> = ({ displayStatus }) => {
  const isLoading = displayStatus === 'in_progress' || displayStatus === 'pending';

  return (
    <div className="flex items-center gap-2">
      <Badge className={`${getStatusColor(displayStatus)} text-xs px-2 py-0 flex items-center gap-1`}>
        {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
        {getStatusText(displayStatus)}
      </Badge>
    </div>
  );
};

export default ChildPageStatusBadge;
