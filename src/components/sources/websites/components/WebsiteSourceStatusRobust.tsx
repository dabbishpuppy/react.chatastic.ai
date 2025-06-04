
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle, Clock, RefreshCw, Wifi, WifiOff } from 'lucide-react';
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

  return (
    <div className="space-y-3">
      {/* Status Badge and Progress */}
      <div className="flex items-center gap-3">
        <Badge className={`${statusConfig.className} border flex-shrink-0`}>
          {statusConfig.icon}
          {statusConfig.text}
        </Badge>
        
        {statusData.totalPages > 0 && (
          <div className="text-sm text-gray-600">
            {statusData.completedPages}/{statusData.totalPages} pages
            {statusData.failedPages > 0 && (
              <span className="text-red-600 ml-1">
                ({statusData.failedPages} failed)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Connection Status and Controls */}
      {showConnectionStatus && (
        <div className="flex items-center gap-2 text-xs">
          {/* Connection Status */}
          <div className="flex items-center gap-1">
            {isConnected ? (
              <>
                <Wifi size={12} className="text-green-500" />
                <span className="text-green-600">Live</span>
              </>
            ) : isPolling ? (
              <>
                <RefreshCw size={12} className="text-blue-500 animate-spin" />
                <span className="text-blue-600">Polling</span>
              </>
            ) : (
              <>
                <WifiOff size={12} className="text-gray-400" />
                <span className="text-gray-500">Offline</span>
              </>
            )}
          </div>

          {/* Last Updated */}
          <span className="text-gray-400">
            • Updated {statusData.lastUpdated.toLocaleTimeString()}
          </span>

          {/* Manual Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshStatus}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw size={10} className="mr-1" />
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
};

export default WebsiteSourceStatusRobust;
