
import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ConnectionStatusIndicatorProps {
  isConnected: boolean;
  isPolling?: boolean;
  showText?: boolean;
  size?: 'sm' | 'md';
}

const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  isConnected,
  isPolling = false,
  showText = true,
  size = 'sm'
}) => {
  const iconSize = size === 'sm' ? 12 : 16;
  
  if (isConnected) {
    return (
      <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
        <Wifi size={iconSize} className="mr-1" />
        {showText && "Live"}
      </Badge>
    );
  }
  
  if (isPolling) {
    return (
      <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
        <RefreshCw size={iconSize} className="mr-1 animate-spin" />
        {showText && "Updating"}
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-500">
      <WifiOff size={iconSize} className="mr-1" />
      {showText && "Offline"}
    </Badge>
  );
};

export default ConnectionStatusIndicator;
