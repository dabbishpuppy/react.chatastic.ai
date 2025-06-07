
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getWorkflowStatusConfig } from '../services/workflowStatusConfig';

interface WorkflowStatusBadgeProps {
  status: string;
  workflowStatus?: string;
  showProgress?: boolean;
  progress?: number;
  className?: string;
}

const WorkflowStatusBadge: React.FC<WorkflowStatusBadgeProps> = ({
  status,
  workflowStatus,
  showProgress = false,
  progress,
  className = ''
}) => {
  // Use workflow status if available, otherwise fall back to regular status
  const displayStatus = workflowStatus || status;
  const statusConfig = getWorkflowStatusConfig(displayStatus);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge className={`${statusConfig.className} border flex-shrink-0`}>
        {statusConfig.icon}
        {statusConfig.text}
      </Badge>
      
      {showProgress && progress !== undefined && (
        <div className="text-xs text-gray-500">
          {progress}%
        </div>
      )}
    </div>
  );
};

export default WorkflowStatusBadge;
