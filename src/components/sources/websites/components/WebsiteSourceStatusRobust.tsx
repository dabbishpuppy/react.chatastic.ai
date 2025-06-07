
import React from 'react';
import { useSourceStatusRealtime } from '../hooks/useSourceStatusRealtime';
import SourceStatusDisplay from './SourceStatusDisplay';

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
  const {
    status,
    progress,
    linksCount,
    isConnected,
    isInitializing
  } = useSourceStatusRealtime({ sourceId, initialStatus });

  return (
    <SourceStatusDisplay
      status={status}
      progress={progress}
      linksCount={linksCount}
      isConnected={isConnected}
      showConnectionStatus={showConnectionStatus}
      isInitializing={isInitializing}
    />
  );
};

export default WebsiteSourceStatusRobust;
