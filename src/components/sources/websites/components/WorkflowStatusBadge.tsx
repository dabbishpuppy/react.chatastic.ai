
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getWorkflowStatusConfig } from '../services/workflowStatusConfig';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Loader2, 
  GraduationCap, 
  RefreshCw, 
  Trash2 
} from 'lucide-react';

interface WorkflowStatusBadgeProps {
  status: string;
  workflowStatus?: string;
  showProgress?: boolean;
  progress?: number;
  className?: string;
}

const iconMap = {
  Clock,
  Loader2,
  CheckCircle,
  GraduationCap,
  RefreshCw,
  Trash2,
  AlertTriangle
};

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
  
  const IconComponent = iconMap[statusConfig.iconName as keyof typeof iconMap];
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge className={`${statusConfig.className} border flex-shrink-0`}>
        {IconComponent && (
          <IconComponent 
            size={14} 
            className={`mr-1 ${statusConfig.isAnimated ? 'animate-spin' : ''}`} 
          />
        )}
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
