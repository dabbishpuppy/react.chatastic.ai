
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface ChildPageInfoProps {
  url: string;
  status: string;
  contentSize?: number;
  chunksCreated?: number;
  processingTimeMs?: number;
  errorMessage?: string;
}

const ChildPageInfo: React.FC<ChildPageInfoProps> = ({
  url,
  status,
  contentSize,
  chunksCreated,
  processingTimeMs,
  errorMessage
}) => {
  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return url;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    const size = bytes / Math.pow(k, i);
    const formattedSize = i === 0 ? size.toString() : size.toFixed(1);
    
    return `${formattedSize} ${sizes[i]}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-white';
      case 'in_progress': return 'bg-blue-500 text-white';
      case 'pending': return 'bg-yellow-500 text-white';
      case 'failed': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  return (
    <>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate" title={url}>
          {formatUrl(url)}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {contentSize && (
            <span>{formatBytes(contentSize)}</span>
          )}
          {chunksCreated && (
            <span>• {chunksCreated} chunks</span>
          )}
          {processingTimeMs && (
            <span>• {processingTimeMs}ms</span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Badge className={`${getStatusColor(status)} text-xs px-2 py-0`}>
          {getStatusText(status)}
        </Badge>
      </div>

      {errorMessage && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
          Error: {errorMessage}
        </div>
      )}
    </>
  );
};

export default ChildPageInfo;
