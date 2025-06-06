
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Info, ArrowUpRight } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import WebsiteSourceStatus from './WebsiteSourceStatus';
import { formatFileSize } from '@/components/sources/components/SourceSizeFormatter';

// Helper function to format bytes if needed
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  const formattedSize = i === 0 ? size.toString() : size.toFixed(1);
  return `${formattedSize} ${sizes[i]}`;
};

interface WebsiteSourceInfoProps {
  title: string;
  url: string;
  createdAt?: string;
  linksCount?: number;
  lastCrawledAt?: string;
  crawlStatus?: string;
  metadata?: any;
  content?: string;
  childSources?: any[];
  isChild?: boolean;
  totalContentSize?: number;
  compressedContentSize?: number;
  originalSize?: number;
  compressedSize?: number;
  source?: any; // Full source object for status computation
}

const WebsiteSourceInfo: React.FC<WebsiteSourceInfoProps> = ({
  title,
  url,
  createdAt,
  linksCount = 0,
  lastCrawledAt,
  crawlStatus,
  metadata,
  isChild = false,
  totalContentSize,
  compressedContentSize,
  originalSize,
  compressedSize,
  source
}) => {
  const displayTitle = title || url;
  const displayTotalSize = totalContentSize || originalSize || 0;
  const displayCompressedSize = compressedContentSize || compressedSize || 0;

  const hostname = url ? new URL(url).hostname.replace('www.', '') : '';

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <h3 className="font-medium text-gray-900 truncate max-w-md" title={displayTitle}>
          {displayTitle}
        </h3>
        
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700">
          <ExternalLink size={14} />
        </a>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-blue-600"
        >
          {hostname}
          <ArrowUpRight className="h-3 w-3" />
        </a>
        
        {!isChild && (
          <>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">{linksCount} pages</span>
          </>
        )}
        
        {lastCrawledAt && (
          <>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">
              Last crawled {formatDistanceToNow(new Date(lastCrawledAt), { addSuffix: true })}
            </span>
          </>
        )}

        {/* Display total content size and compression if available */}
        {displayTotalSize > 0 && (
          <>
            <span className="hidden md:inline">•</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="hidden md:inline cursor-help flex items-center gap-1">
                    {formatBytes(displayCompressedSize)}
                    <Info size={12} />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Original size: {formatBytes(displayTotalSize)}</p>
                  <p>Compressed size: {formatBytes(displayCompressedSize)}</p>
                  <p>Compression: {Math.round((1 - (displayCompressedSize / displayTotalSize)) * 100)}%</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>

      <div className="mt-1">
        <WebsiteSourceStatus 
          status={crawlStatus} 
          metadata={metadata} 
          isChild={isChild}
          source={source}
        />
      </div>
    </div>
  );
};

export default WebsiteSourceInfo;
