
import React from 'react';
import { Link } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AgentSource } from '@/types/rag';

interface WebsiteSourceInfoProps {
  title?: string;
  url: string;
  createdAt: string;
  linksCount?: number;
  lastCrawledAt?: string;
  isChild?: boolean;
  crawlStatus?: string;
  metadata?: any;
  content?: string;
  childSources?: AgentSource[];
}

const WebsiteSourceInfo: React.FC<WebsiteSourceInfoProps> = ({
  title,
  url,
  linksCount,
  lastCrawledAt,
  isChild = false,
  crawlStatus,
  metadata,
  content,
  childSources = []
}) => {
  const iconSize = isChild ? 'h-3 w-3' : 'h-4 w-4';
  const titleSize = isChild ? 'text-sm' : '';
  const metaSize = isChild ? 'text-xs' : 'text-sm';

  // Only show metadata when crawling is completed
  const showMetadata = crawlStatus === 'completed';

  // Fixed width containers to prevent layout shifts
  const containerWidth = isChild ? 'w-full max-w-md' : 'flex-1';
  
  // For child sources, show the full URL with protocol
  // For parent sources, show the title (domain) but ensure URL is complete
  const displayText = isChild ? url : (title || url);
  const displayUrl = isChild && url.length > 45 ? `${url.substring(0, 45)}...` : displayText;

  // Calculate content size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  };

  const getContentSize = () => {
    let size = 0;
    
    if (isChild) {
      // For child sources, calculate individual size
      if (content) {
        size += new Blob([content]).size;
      }
      
      if (metadata?.content_size) {
        size += metadata.content_size;
      }
    } else {
      // For parent sources, calculate total size from all child sources
      if (childSources && childSources.length > 0) {
        size = childSources.reduce((total, child) => {
          let childSize = 0;
          
          if (child.content) {
            childSize += new Blob([child.content]).size;
          }
          
          if (child.metadata?.content_size) {
            childSize += child.metadata.content_size;
          }
          
          return total + childSize;
        }, 0);
      } else {
        // Fallback to metadata if no child sources available
        if (metadata?.total_content_size) {
          size += metadata.total_content_size;
        } else if (content) {
          size += new Blob([content]).size;
        }
      }
    }
    
    return size;
  };

  const contentSize = getContentSize();
  const sizeText = formatSize(contentSize);

  return (
    <div className="flex items-center flex-1 min-w-0">
      <div className={`mr-3 flex-shrink-0`}>
        <Link className={`${iconSize} text-purple-600`} />
      </div>
      
      <div className={`${containerWidth} min-w-0`}>
        <div className={`font-medium ${titleSize} truncate`} title={displayText}>
          {displayUrl}
        </div>
        
        {/* Show metadata only when crawling is completed */}
        {showMetadata && (
          <div className={`flex items-center gap-2 ${metaSize} text-gray-500 mt-1`}>
            {linksCount && linksCount > 0 && (
              <span>{linksCount} links</span>
            )}
            {sizeText && (
              <>
                {linksCount && linksCount > 0 && <span>•</span>}
                <span>{sizeText}</span>
              </>
            )}
            {lastCrawledAt && (
              <>
                {(linksCount && linksCount > 0) || sizeText ? <span>•</span> : null}
                <span>Last crawled {formatDistanceToNow(new Date(lastCrawledAt), { addSuffix: true })}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsiteSourceInfo;
