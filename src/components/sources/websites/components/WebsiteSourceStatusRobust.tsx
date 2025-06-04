
import React, { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import ConnectionStatusIndicator from '@/components/ConnectionStatusIndicator';
import { useRobustCrawlStatus } from '@/hooks/useRobustCrawlStatus';

interface WebsiteSourceStatusRobustProps {
  sourceId: string;
  initialStatus?: string;
  showConnectionStatus?: boolean;
}

const WebsiteSourceStatusRobust: React.FC<WebsiteSourceStatusRobustProps> = ({
  sourceId,
  initialStatus,
  showConnectionStatus = true
}) => {
  const { statusData, isPolling, refreshStatus, isConnected } = useRobustCrawlStatus(sourceId);
  const [lastStatus, setLastStatus] = useState<string | null>(null);

  // ENHANCED: Emit custom events when status changes to completed
  useEffect(() => {
    if (statusData.status !== lastStatus) {
      console.log(`📊 Status changed for source ${sourceId}: ${lastStatus} -> ${statusData.status}`);
      
      if (statusData.status === 'completed' && lastStatus === 'in_progress') {
        console.log('🎉 Crawl completed, emitting completion event');
        
        // Emit custom events for other components to listen to
        window.dispatchEvent(new CustomEvent('crawlCompleted', {
          detail: { sourceId, status: statusData.status }
        }));
        
        window.dispatchEvent(new CustomEvent('sourceStatusChanged', {
          detail: { sourceId, oldStatus: lastStatus, newStatus: statusData.status }
        }));
      }
      
      setLastStatus(statusData.status);
    }
  }, [statusData.status, lastStatus, sourceId]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock size={14} className="mr-1" />,
          text: 'Pending',
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
      case 'in_progress':
        return {
          icon: <Loader2 size={14} className="mr-1 animate-spin" />,
          text: 'Crawling',
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'completed':
        return {
          icon: <CheckCircle size={14} className="mr-1" />,
          text: 'Completed',
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'failed':
        return {
          icon: <AlertTriangle size={14} className="mr-1" />,
          text: 'Failed',
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      default:
        return {
          icon: <Clock size={14} className="mr-1" />,
          text: 'Unknown',
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const statusConfig = getStatusConfig(statusData.status);
  const showProgress = statusData.status === 'in_progress' && statusData.totalPages > 0;
  const progressPercentage = showProgress 
    ? Math.round((statusData.completedPages / statusData.totalPages) * 100)
    : 0;

  return (
    <div className="flex items-center gap-3">
      <Badge className={`${statusConfig.className} border flex-shrink-0`}>
        {statusConfig.icon}
        {statusConfig.text}
        {showProgress && (
          <span className="ml-1 text-xs">
            ({statusData.completedPages}/{statusData.totalPages})
          </span>
        )}
      </Badge>

      {showProgress && (
        <div className="flex-1 max-w-20">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {showConnectionStatus && (
        <div className="flex items-center gap-2">
          <ConnectionStatusIndicator 
            isConnected={isConnected}
            isPolling={isPolling}
            showText={false}
            size="sm"
          />
          
          {(!isConnected || isPolling) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshStatus}
              className="h-6 px-2 text-xs"
            >
              <RefreshCw size={12} className="mr-1" />
              Refresh
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default WebsiteSourceStatusRobust;
