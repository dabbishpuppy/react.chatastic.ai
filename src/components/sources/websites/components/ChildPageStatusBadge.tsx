
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { SimpleStatusService } from '@/services/SimpleStatusService';
import { getSimpleStatusConfig } from '../services/simpleStatusConfig';

interface ChildPageStatusBadgeProps {
  status: string;
  isLoading?: boolean;
  sourceData?: any;
}

const ChildPageStatusBadge: React.FC<ChildPageStatusBadgeProps> = ({
  status,
  isLoading = false,
  sourceData
}) => {
  const displayStatus = sourceData ? SimpleStatusService.getSourceStatus(sourceData) : status;
  const statusConfig = getSimpleStatusConfig(displayStatus);

  return (
    <Badge className={`${statusConfig.className} border flex-shrink-0`}>
      {statusConfig.icon}
      {statusConfig.text}
    </Badge>
  );
};

export default ChildPageStatusBadge;
