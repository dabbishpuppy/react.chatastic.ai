
import React from 'react';
import { useSourceStatusRealtime } from '../hooks/useSourceStatusRealtime';
import WorkflowStatusBadge from './WorkflowStatusBadge';
import { Wifi, WifiOff } from 'lucide-react';

interface WebsiteSourceStatusRobustProps {
  sourceId: string;
  initialStatus?: string;
  showConnectionStatus?: boolean;
  showProgress?: boolean;
}

const WebsiteSourceStatusRobust: React.FC<WebsiteSourceStatusRobustProps> = ({
  sourceId,
  initialStatus,
  showConnectionStatus = true,
  showProgress = true
}) => {
  const {
    status,
    progress,
    linksCount,
    isConnected,
    sourceData
  } = useSourceStatusRealtime({
    sourceId,
    initialStatus
  });

  return (
    <div className="flex items-center gap-3">
      <WorkflowStatusBadge
        status={status}
        workflowStatus={sourceData?.workflow_status}
        showProgress={showProgress && (status === 'in_progress' || status === 'CRAWLING')}
        progress={progress}
      />
      
      {(status === 'in_progress' || status === 'CRAWLING' || status === 'recrawling') && (
        <div className="text-xs text-gray-500">
          {progress > 0 && `${progress}% • `}
          {linksCount > 0 && `${linksCount} links`}
        </div>
      )}
      
      {showConnectionStatus && (
        <div className="flex items-center">
          {isConnected ? (
            <Wifi size={12} className="text-green-500" />
          ) : (
            <WifiOff size={12} className="text-red-500" />
          )}
        </div>
      )}
    </div>
  );
};

export default WebsiteSourceStatusRobust;
