
import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Calendar, Link, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AgentSource } from '@/types/rag';
import WebsiteSourceStatusBadges from './WebsiteSourceStatusBadges';
import { supabase } from '@/integrations/supabase/client';

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
  showStatusBadge?: boolean;
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
  sourceId,
  showStatusBadge = true
}) => {
  const [realtimeCrawlStatus, setRealtimeCrawlStatus] = useState(crawlStatus);
  const [realtimeSource, setRealtimeSource] = useState(source);

  // Set up realtime subscription for parent source status changes
  useEffect(() => {
    if (!sourceId || isChild) return;

    console.log(`📡 Setting up realtime status tracking for parent source: ${sourceId}`);

    const channel = supabase
      .channel(`source-info-${sourceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_sources',
          filter: `id=eq.${sourceId}`
        },
        (payload) => {
          const updatedSource = payload.new as any;
          console.log('📡 Source status update in WebsiteSourceInfo:', updatedSource);
          
          setRealtimeCrawlStatus(updatedSource.crawl_status);
          setRealtimeSource(updatedSource);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Source info subscription status for ${sourceId}:`, status);
      });

    return () => {
      console.log(`🔌 Cleaning up source info subscription for: ${sourceId}`);
      supabase.removeChannel(channel);
    };
  }, [sourceId, isChild]);

  // Update local state when props change
  useEffect(() => {
    setRealtimeCrawlStatus(crawlStatus);
    setRealtimeSource(source);
  }, [crawlStatus, source]);

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
  const shouldShowRealtimeContentSize = !isChild && totalContentSize > 0;
  const shouldShowCompressionMetrics = !isChild && totalContentSize > 0 && compressedContentSize > 0;

  // Show total child sources size when training is completed and we have child data
  const shouldShowChildTotalSize = !isChild && (realtimeCrawlStatus === 'trained' || realtimeCrawlStatus === 'completed') && realtimeSource?.total_content_size > 0;

  // Show total links from parent source metadata when available
  const shouldShowTotalLinks = !isChild && realtimeSource?.total_jobs > 0;

  // Get total child pages size from metadata - Show for trained status as well
  const childPagesSize = realtimeSource?.metadata?.total_child_pages_size || 0;
  const shouldShowChildPagesSize = !isChild && childPagesSize > 0 && (
    realtimeCrawlStatus === 'trained' || 
    realtimeCrawlStatus === 'completed' || 
    realtimeCrawlStatus === 'ready_for_training'
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
        {/* Only show status badges here for child sources or when explicitly requested */}
        {(isChild || showStatusBadge) && (
          <div className="flex items-center gap-2">
            <WebsiteSourceStatusBadges
              crawlStatus={realtimeCrawlStatus}
              isExcluded={false}
              linksCount={linksCount}
              sourceId={sourceId}
              source={realtimeSource}
            />
          </div>
        )}
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
                <span>{realtimeSource.total_jobs} links</span>
              </div>
            </>
          )}

          {/* Priority 1: Show realtime child source total size */}
          {shouldShowRealtimeContentSize && (
            <>
              <span className="mx-2">•</span>
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>{formatBytes(totalContentSize)}</span>
              </div>
            </>
          )}

          {/* Priority 2: Show metadata child pages size if no realtime data */}
          {!shouldShowRealtimeContentSize && shouldShowChildPagesSize && (
            <>
              <span className="mx-2">•</span>
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>{formatBytes(childPagesSize)}</span>
              </div>
            </>
          )}

          {/* Priority 3: Show source total content size if no other size data */}
          {!shouldShowRealtimeContentSize && !shouldShowChildPagesSize && shouldShowChildTotalSize && (
            <>
              <span className="mx-2">•</span>
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>{formatBytes(realtimeSource.total_content_size)}</span>
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
