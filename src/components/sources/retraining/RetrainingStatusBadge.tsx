
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Loader2, Clock } from 'lucide-react';

interface RetrainingStatusBadgeProps {
  status: 'idle' | 'training' | 'completed' | 'failed';
  isRetrainingNeeded: boolean;
}

export const RetrainingStatusBadge: React.FC<RetrainingStatusBadgeProps> = ({
  status,
  isRetrainingNeeded
}) => {
  const getStatusConfig = () => {
    if (status === 'completed') {
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-600" />,
        text: 'Completed',
        variant: 'default' as const
      };
    }
    
    if (status === 'failed') {
      return {
        icon: <AlertCircle className="h-5 w-5 text-red-600" />,
        text: 'Failed',
        variant: 'destructive' as const
      };
    }
    
    if (status === 'training') {
      return {
        icon: <Loader2 className="h-5 w-5 animate-spin text-blue-600" />,
        text: 'Training',
        variant: 'default' as const
      };
    }
    
    if (isRetrainingNeeded) {
      return {
        icon: <AlertCircle className="h-5 w-5 text-orange-600" />,
        text: 'Needs Training',
        variant: 'secondary' as const
      };
    }
    
    return {
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      text: 'Up to Date',
      variant: 'outline' as const
    };
  };

  const config = getStatusConfig();

  return (
    <Badge variant={config.variant} className="flex items-center gap-2">
      {config.icon}
      {config.text}
    </Badge>
  );
};
