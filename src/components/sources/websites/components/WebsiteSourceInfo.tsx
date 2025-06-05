
import React from 'react';
import { formatDistanceToNow } from 'date-fns';

interface WebsiteSourceInfoProps {
  title?: string;
  url: string;
  createdAt: string;
  linksCount?: number;
  lastCrawledAt?: string;
  crawlStatus?: string;
  metadata?: any;
  content?: string;
  childSources?: any[];
  isChild?: boolean;
  sourcePages?: { id: string; status: string; content_size?: number }[];
  // Add database aggregated fields
  totalContentSize?: number;
  compressedContentSize?: number;
  originalSize?: number;
  compressedSize?: number;
}

const WebsiteSourceInfo: React.FC<WebsiteSourceInfoProps> = ({
  title,
  url,
  createdAt,
  linksCount,
  lastCrawledAt,
  crawlStatus,
  metadata,
  content,
  childSources = [],
  isChild = false,
  sourcePages = [],
  totalContentSize,
  compressedContentSize,
  originalSize,
  compressedSize
}) => {
  // For parent sources, show count from sourcePages if available, otherwise use linksCount
  const displayLinksCount = !isChild ? (sourcePages?.length || linksCount || 0) : undefined;
  
  // Calculate status counts from sourcePages for parent sources
  const statusCounts = !isChild && sourcePages?.length ? {
    completed: sourcePages.filter(p => p.status === 'completed').length,
    failed: sourcePages.filter(p => p.status === 'failed').length,
    pending: sourcePages.filter(p => p.status === 'pending').length,
    in_progress: sourcePages.filter(p => p.status === 'in_progress').length
  } : null;

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return url;
    }
  };

  const getStatusText = () => {
    if (isChild) return null;
    
    if (statusCounts && displayLinksCount > 0) {
      const parts = [];
      if (statusCounts.completed > 0) parts.push(`${statusCounts.completed} completed`);
      if (statusCounts.failed > 0) parts.push(`${statusCounts.failed} failed`);
      if (statusCounts.in_progress > 0) parts.push(`${statusCounts.in_progress} in progress`);
      if (statusCounts.pending > 0) parts.push(`${statusCounts.pending} pending`);
      
      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
    
    return null;
  };

  return (
    <div className="flex items-center">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-gray-900 truncate" title={url}>
            {title || formatUrl(url)}
          </p>
        </div>
        
        <div className="flex items-center gap-1 text-xs text-gray-500">
          {/* Use consistent date format for both parent and child sources */}
          <span>Added {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
          
          {!isChild && displayLinksCount > 0 && (
            <>
              <span>•</span>
              <span>{displayLinksCount} links</span>
            </>
          )}
          
          {lastCrawledAt && (
            <>
              <span>•</span>
              <span>Last crawled {formatDistanceToNow(new Date(lastCrawledAt), { addSuffix: true })}</span>
            </>
          )}
        </div>
        
        {getStatusText() && (
          <div className="text-xs text-gray-600 mt-1">
            {getStatusText()}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsiteSourceInfo;
