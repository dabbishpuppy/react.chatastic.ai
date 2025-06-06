
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Calendar, Database, FileText, Loader2 } from 'lucide-react';

interface ChildPageInfoProps {
  url: string;
  status: string;
  contentSize?: number;
  chunksCreated?: number;
  processingTimeMs?: number;
  errorMessage?: string;
  createdAt: string;
}

const ChildPageInfo: React.FC<ChildPageInfoProps> = ({
  url,
  status,
  contentSize,
  chunksCreated,
  errorMessage,
  createdAt
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

  const formatTimeAgo = (dateString: string): string => {
    const timeAgo = formatDistanceToNow(new Date(dateString), { addSuffix: true });
    
    // Handle various time formats that might include "0"
    return timeAgo
      .replace(/^about\s+0\s+\w+\s+ago$/, 'just now')
      .replace(/^0\s+\w+\s+ago$/, 'just now')
      .replace(/^about\s+/, '')
      .replace(/^less than a minute ago$/, 'just now');
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

  const isLoading = status === 'in_progress' || status === 'pending';

  return (
    <>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate" title={url}>
          {formatUrl(url)}
        </p>
        <div className="flex items-center text-xs text-gray-500 mt-1">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Crawled {formatTimeAgo(createdAt)}</span>
          </div>
          
          {status === 'completed' && contentSize && (
            <>
              <span className="mx-2">•</span>
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>{formatBytes(contentSize)}</span>
              </div>
            </>
          )}
          
          {chunksCreated && (
            <>
              <span className="mx-2">•</span>
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>{chunksCreated} chunks</span>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Badge className={`${getStatusColor(status)} text-xs px-2 py-0 flex items-center gap-1`}>
          {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
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
