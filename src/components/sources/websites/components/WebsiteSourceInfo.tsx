import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { formatFileSize } from '@/components/sources/components/SourceSizeFormatter';

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

  // Create a mock source object for the formatter using database aggregated fields
  const sourceForSizeCalculation = {
    source_type: 'website',
    total_content_size: totalContentSize,
    compressed_content_size: compressedContentSize,
    original_size: originalSize,
    compressed_size: compressedSize,
    metadata: metadata,
    content: content
  };

  const shouldShowSize = () => {
    // For parent sources, show size if we have aggregated database fields
    if (!isChild) {
      return (totalContentSize && totalContentSize > 0) || 
             (compressedContentSize && compressedContentSize > 0) ||
             (originalSize && originalSize > 0);
    }
    // For child sources, show size if we have content
    return content && content.length > 0;
  };

  return (
    <div className="flex items-center">
      {/* Remove blue dot for child sources, keep for parent sources */}
      {!isChild && <div className="w-3 h-3 rounded-full bg-blue-500 mr-3 flex-shrink-0"></div>}
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
          
          {shouldShowSize() && (
            <>
              <span>•</span>
              <span>{formatFileSize(sourceForSizeCalculation as any)}</span>
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
