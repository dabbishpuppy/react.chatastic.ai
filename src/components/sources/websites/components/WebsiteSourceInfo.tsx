
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Calendar, Link, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AgentSource } from '@/types/rag';
import WebsiteSourceStatusBadges from './WebsiteSourceStatusBadges';

interface WebsiteSourceInfoProps {
  title?: string;
  url: string;
  createdAt: string;
  linksCount?: number;
  lastCrawledAt?: string;
  crawlStatus?: string;
  metadata?: any;
  isChild?: boolean;
  totalContentSize?: number;
  compressedContentSize?: number;
  source?: AgentSource;
  sourceId?: string;
}

const WebsiteSourceInfo: React.FC<WebsiteSourceInfoProps> = ({
  title,
  url,
  createdAt,
  linksCount = 0,
  crawlStatus = 'unknown',
  metadata,
  isChild = false,
  totalContentSize = 0,
  compressedContentSize = 0,
  source,
  sourceId
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

  const shouldShowLinksCount = !isChild && linksCount > 0;
  const shouldShowContentSize = !isChild && totalContentSize > 0;
  const shouldShowCompressionMetrics = !isChild && totalContentSize > 0 && compressedContentSize > 0;

  // Show total child sources size when training is completed and we have child data
  const shouldShowChildTotalSize = !isChild && (crawlStatus === 'trained' || crawlStatus === 'completed') && source?.total_content_size > 0;

  // Show total links from parent source metadata when available
  const shouldShowTotalLinks = !isChild && source?.total_jobs > 0;

  // Get total child pages size from metadata - FIXED: Show for trained status as well
  const childPagesSize = source?.metadata?.total_child_pages_size || 0;
  const shouldShowChildPagesSize = !isChild && childPagesSize > 0 && (
    crawlStatus === 'trained' || 
    crawlStatus === 'completed' || 
    crawlStatus === 'ready_for_training'
  );

  const compressionRatio = shouldShowCompressionMetrics 
    ? ((totalContentSize - compressedContentSize) / totalContentSize * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 truncate" title={title || url}>
              {title || formatUrl(url)}
            </h3>
            <ExternalLink 
              className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" 
              onClick={() => window.open(url, '_blank')}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <WebsiteSourceStatusBadges
            crawlStatus={crawlStatus}
            isExcluded={false}
            linksCount={linksCount}
            sourceId={sourceId || ''}
            source={source || null}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Crawled {formatTimeAgo(createdAt)}</span>
          </div>
          
          {shouldShowLinksCount && (
            <>
              <span className="mx-2">•</span>
              <div className="flex items-center gap-1">
                <Link className="w-3 h-3" />
                <span>{linksCount} links</span>
              </div>
            </>
          )}

          {shouldShowTotalLinks && (
            <>
              <span className="mx-2">•</span>
              <div className="flex items-center gap-1">
                <Link className="w-3 h-3" />
                <span>{source.total_jobs} links</span>
              </div>
            </>
          )}

          {shouldShowChildPagesSize && (
            <>
              <span className="mx-2">•</span>
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>{formatBytes(childPagesSize)}</span>
              </div>
            </>
          )}
          
          {shouldShowContentSize && !shouldShowChildPagesSize && (
            <>
              <span className="mx-2">•</span>
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>{formatBytes(totalContentSize)}</span>
              </div>
            </>
          )}

          {shouldShowChildTotalSize && !shouldShowChildPagesSize && (
            <>
              <span className="mx-2">•</span>
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>{formatBytes(source.total_content_size)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {shouldShowCompressionMetrics && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
          <div className="flex items-center justify-between">
            <span>Compressed: {formatBytes(compressedContentSize)}</span>
            <span className="text-green-600 font-medium">{compressionRatio}% saved</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsiteSourceInfo;
