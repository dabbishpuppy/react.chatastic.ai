
import React from 'react';
import { ExternalLink, Calendar, Link as LinkIcon, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AgentSource } from '@/types/rag';
import WebsiteSourceStatusBadges from './WebsiteSourceStatusBadges';

interface WebsiteSourceInfoProps {
  title: string;
  url: string;
  createdAt: string;
  linksCount: number;
  lastCrawledAt?: string;
  crawlStatus: string;
  metadata?: any;
  isChild?: boolean;
  totalContentSize?: number;
  compressedContentSize?: number;
  source?: AgentSource;
  sourceId?: string;
  showStatusInline?: boolean;
}

const WebsiteSourceInfo: React.FC<WebsiteSourceInfoProps> = ({
  title,
  url,
  createdAt,
  linksCount,
  lastCrawledAt,
  crawlStatus,
  metadata,
  isChild = false,
  totalContentSize = 0,
  compressedContentSize = 0,
  source,
  sourceId,
  showStatusInline = true
}) => {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 truncate">{title}</h3>
            {showStatusInline && source && (
              <WebsiteSourceStatusBadges
                crawlStatus={crawlStatus}
                isExcluded={source.is_excluded || false}
                linksCount={linksCount}
                sourceId={sourceId}
                source={source}
              />
            )}
          </div>
          
          <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
            <ExternalLink className="w-3 h-3" />
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 truncate"
            >
              {url}
            </a>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Crawled {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </div>
        
        {!isChild && linksCount > 0 && (
          <div className="flex items-center gap-1">
            <LinkIcon className="w-3 h-3" />
            {linksCount} links
          </div>
        )}

        {totalContentSize > 0 && (
          <div className="flex items-center gap-1">
            <span>{formatSize(totalContentSize)}</span>
            {compressedContentSize > 0 && (
              <span className="text-gray-400">({formatSize(compressedContentSize)} compressed)</span>
            )}
          </div>
        )}

        {lastCrawledAt && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last crawled {formatDistanceToNow(new Date(lastCrawledAt), { addSuffix: true })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsiteSourceInfo;
