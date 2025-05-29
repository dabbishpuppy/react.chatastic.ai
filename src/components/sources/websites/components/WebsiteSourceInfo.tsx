
import React from 'react';
import { Link } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import WebsiteSourceStatus from './WebsiteSourceStatus';

interface WebsiteSourceInfoProps {
  title?: string;
  url: string;
  createdAt: string;
  linksCount?: number;
  lastCrawledAt?: string;
  isChild?: boolean;
  crawlStatus?: string;
}

const WebsiteSourceInfo: React.FC<WebsiteSourceInfoProps> = ({
  title,
  url,
  linksCount,
  lastCrawledAt,
  isChild = false,
  crawlStatus
}) => {
  const iconSize = isChild ? 'h-3 w-3' : 'h-4 w-4';
  const titleSize = isChild ? 'text-sm' : '';
  const metaSize = isChild ? 'text-xs' : 'text-sm';

  // Only show metadata when crawling is completed
  const isCrawling = crawlStatus === 'in_progress' || crawlStatus === 'pending';
  const showMetadata = !isCrawling && crawlStatus === 'completed';

  // Fixed width containers to prevent layout shifts
  const containerWidth = isChild ? 'w-full max-w-md' : 'flex-1';
  
  // For child sources, show the full URL with protocol
  // For parent sources, show the title (domain) but ensure URL is complete
  const displayText = isChild ? url : (title || url);
  const displayUrl = isChild && url.length > 45 ? `${url.substring(0, 45)}...` : displayText;

  return (
    <div className="flex items-center flex-1 min-w-0">
      <div className={`mr-3 flex-shrink-0`}>
        <Link className={`${iconSize} text-purple-600`} />
      </div>
      
      <div className={`${containerWidth} min-w-0`}>
        <div className={`font-medium ${titleSize} truncate`} title={displayText}>
          {displayUrl}
        </div>
        
        {/* Show status for parent sources when crawling */}
        {!isChild && isCrawling && (
          <div className="mt-1">
            <WebsiteSourceStatus status={crawlStatus} />
          </div>
        )}
        
        {/* Show metadata when crawling is completed */}
        {showMetadata && (
          <div className={`flex items-center gap-2 ${metaSize} text-gray-500 mt-1`}>
            {linksCount && linksCount > 0 && (
              <span>{linksCount} links</span>
            )}
            {lastCrawledAt && (
              <>
                {linksCount && linksCount > 0 && <span>•</span>}
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
