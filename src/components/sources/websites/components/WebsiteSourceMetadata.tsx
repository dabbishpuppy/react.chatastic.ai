
import React from 'react';
import { AgentSource } from '@/types/rag';
import { Calendar, Link, Database } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WebsiteSourceMetadataProps {
  source: AgentSource;
  childSources: AgentSource[];
  status: string;
}

export const WebsiteSourceMetadata: React.FC<WebsiteSourceMetadataProps> = ({
  source,
  childSources,
  status
}) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    try {
      const parsedDate = new Date(dateString);
      const formatted = formatDistanceToNow(parsedDate, { addSuffix: true });
      return formatted;
    } catch (error) {
      console.error('🐛 DEBUG formatDate - Error:', error);
      return 'Invalid date';
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

  // Calculate total child source sizes - only include sources that have been trained (have chunks)
  const totalChildSize = React.useMemo(() => {
    if (childSources.length > 0) {
      return childSources.reduce((total, child) => {
        // Only include in total if the child has chunks created (i.e., has been trained)
        const hasChunks = child.metadata?.chunksCreated > 0 || child.unique_chunks > 0;
        if (hasChunks) {
          return total + (child.total_content_size || 0);
        }
        return total;
      }, 0);
    }
    return 0;
  }, [childSources]);

  // Calculate total child links from source.links_count and actual child pages
  const totalChildLinks = React.useMemo(() => {
    const discoveredLinks = source.links_count || 0;
    const actualChildPages = childSources.length;
    // Show the higher number to be more accurate
    return Math.max(discoveredLinks, actualChildPages);
  }, [source.links_count, childSources.length]);

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-3 text-xs text-gray-400">
        {/* 1. Crawled time first with Calendar icon */}
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>Crawled {formatDate(source.last_crawled_at || source.updated_at)}</span>
        </div>
        
        {/* 2. Total content size with Database icon */}
        {totalChildSize > 0 && (
          <>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              <span className="font-medium">{formatBytes(totalChildSize)} total</span>
            </div>
          </>
        )}
        
        {/* 3. Total child links/pages with Link icon */}
        {totalChildLinks > 0 && (
          <>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Link className="w-3 h-3" />
              <span>{totalChildLinks} {childSources.length > 0 ? 'pages' : 'links'}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
