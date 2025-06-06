
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
import { getStatusConfig } from '../services/statusConfigService';

interface SourceStatusDisplayProps {
  status: string;
  progress: number;
  linksCount: number;
  isConnected: boolean;
  showConnectionStatus: boolean;
}

const SourceStatusDisplay: React.FC<SourceStatusDisplayProps> = ({
  status,
  progress,
  linksCount,
  isConnected,
  showConnectionStatus
}) => {
  const statusConfig = getStatusConfig(status);

  return (
    <div className="flex items-center gap-3">
      <Badge className={`${statusConfig.className} border flex-shrink-0`}>
        {statusConfig.icon}
        {statusConfig.text}
      </Badge>
      
      {(status === 'in_progress' || status === 'recrawling') && (
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

export default SourceStatusDisplay;
