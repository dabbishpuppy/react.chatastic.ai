
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { ParentChildStatus } from '@/services/rag/parentChildWorkflowService';

interface ParentChildStatusDisplayProps {
  status: ParentChildStatus;
  onRetryFailed?: () => void;
  showDetails?: boolean;
}

export const ParentChildStatusDisplay: React.FC<ParentChildStatusDisplayProps> = ({
  status,
  onRetryFailed,
  showDetails = true
}) => {
  const getStatusIcon = () => {
    switch (status.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'in_progress':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
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

  const getStatusText = () => {
    if (status.status === 'pending') {
      return status.discoveryCompleted ? 'Pending Processing' : 'Discovering Links';
    }
    
    if (status.status === 'in_progress') {
      return `In Progress (${status.childrenCompleted + status.childrenFailed}/${status.totalChildren})`;
    }
    
    if (status.status === 'completed') {
      const failedText = status.childrenFailed > 0 ? `, ${status.childrenFailed} failed` : '';
      return `Completed (${status.childrenCompleted}/${status.totalChildren}${failedText})`;
    }
    
    return status.status;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          {getStatusIcon()}
          Parent-Child Crawl Status
        </CardTitle>
        <Badge className={getStatusColor()}>
          {getStatusText()}
        </Badge>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          {status.totalChildren > 0 && (
            <div>
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Progress</span>
                <span>{status.progress}%</span>
              </div>
              <Progress value={status.progress} className="h-2" />
            </div>
          )}

          {/* Detailed Stats */}
          {showDetails && status.totalChildren > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{status.totalChildren}</div>
                <div className="text-xs text-muted-foreground">Total Pages</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{status.childrenCompleted}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{status.childrenFailed}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">{status.childrenPending}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>
          )}

          {/* Retry Failed Button */}
          {status.childrenFailed > 0 && onRetryFailed && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">
                {status.childrenFailed} job(s) failed
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onRetryFailed}
                className="ml-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Failed
              </Button>
            </div>
          )}

          {/* Discovery Status */}
          {!status.discoveryCompleted && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Discovering pages...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
