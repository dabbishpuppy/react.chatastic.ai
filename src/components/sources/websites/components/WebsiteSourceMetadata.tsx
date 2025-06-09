
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
    
    // DEBUG: Log the raw date values
    console.log('🐛 DEBUG formatDate - Raw dateString:', JSON.stringify(dateString));
    console.log('🐛 DEBUG formatDate - Type:', typeof dateString);
    console.log('🐛 DEBUG formatDate - Length:', dateString.length);
    
    try {
      const parsedDate = new Date(dateString);
      console.log('🐛 DEBUG formatDate - Parsed date:', parsedDate);
      console.log('🐛 DEBUG formatDate - Is valid:', !isNaN(parsedDate.getTime()));
      
      const formatted = formatDistanceToNow(parsedDate, { addSuffix: true });
      console.log('🐛 DEBUG formatDate - Formatted result:', JSON.stringify(formatted));
      
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

  // Calculate total child source sizes
  const totalChildSize = React.useMemo(() => {
    if (childSources.length > 0) {
      return childSources.reduce((total, child) => {
        return total + (child.total_content_size || 0);
      }, 0);
    }
    return 0;
  }, [childSources]);

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-3 text-xs text-gray-400">
        {/* 1. Crawled time first with Calendar icon, and total size if available */}
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>
            Crawled {formatDate(source.last_crawled_at || source.updated_at)}
            {totalChildSize > 0 && (
              <> • {formatBytes(totalChildSize)}</>
            )}
          </span>
        </div>
        
        {/* 2. Links count with Link icon - show actual child count if available */}
        {(source.links_count !== undefined && source.links_count > 0) || childSources.length > 0 ? (
          <>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Link className="w-3 h-3" />
              <span>{childSources.length > 0 ? `${childSources.length} pages` : `${source.links_count} links`}</span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
