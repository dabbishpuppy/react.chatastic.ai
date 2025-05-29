
import React from 'react';
import { Link } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WebsiteSourceInfoProps {
  title?: string;
  url: string;
  createdAt: string;
  linksCount?: number;
  lastCrawledAt?: string;
  isChild?: boolean;
}

const WebsiteSourceInfo: React.FC<WebsiteSourceInfoProps> = ({
  title,
  url,
  linksCount,
  lastCrawledAt,
  isChild = false
}) => {
  const iconSize = isChild ? 'h-4 w-4' : 'h-5 w-5';
  const iconPadding = isChild ? 'p-1' : 'p-2';
  const titleSize = isChild ? 'text-sm' : '';
  const metaSize = isChild ? 'text-xs' : 'text-sm';

  return (
    <div className="flex items-center flex-1">
      <div className={`bg-gray-100 rounded-full ${iconPadding} mr-3`}>
        <Link className={`${iconSize} text-gray-600`} />
      </div>
      
      <div className="flex-1">
        <div className={`font-medium ${titleSize}`}>{title || url}</div>
        <div className={`flex items-center gap-2 ${metaSize} text-gray-500`}>
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
      </div>
    </div>
  );
};

export default WebsiteSourceInfo;
