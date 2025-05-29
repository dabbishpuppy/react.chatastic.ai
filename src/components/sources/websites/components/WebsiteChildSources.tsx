
import React, { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { AgentSource } from '@/types/rag';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import WebsiteSourceInfo from './WebsiteSourceInfo';
import WebsiteSourceStatus from './WebsiteSourceStatus';
import WebsiteSourceActions from './WebsiteSourceActions';

interface WebsiteChildSourcesProps {
  childSources: AgentSource[];
  parentSourceId: string;
  isCrawling: boolean;
  onEdit: (source: AgentSource) => void;
  onExclude: (source: AgentSource) => void;
  onDelete: (source: AgentSource) => void;
  onRecrawl: (source: AgentSource) => void;
}

const WebsiteChildSources: React.FC<WebsiteChildSourcesProps> = ({
  childSources: initialChildSources,
  parentSourceId,
  isCrawling,
  onEdit,
  onExclude,
  onDelete,
  onRecrawl
}) => {
  const [childSources, setChildSources] = useState<AgentSource[]>(initialChildSources);
  const channelRef = useRef<any>(null);

  // Update when initial child sources change
  useEffect(() => {
    setChildSources(initialChildSources);
  }, [initialChildSources]);

  // Set up real-time subscription for new child sources
  useEffect(() => {
    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`child-sources-${parentSourceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_sources',
          filter: `parent_source_id=eq.${parentSourceId}`
        },
        (payload) => {
          console.log('New child source added:', payload);
          const newSource = payload.new as AgentSource;
          setChildSources(prev => {
            // Check if source already exists to avoid duplicates
            if (prev.some(source => source.id === newSource.id)) {
              return prev;
            }
            return [...prev, newSource];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_sources',
          filter: `parent_source_id=eq.${parentSourceId}`
        },
        (payload) => {
          console.log('Child source updated:', payload);
          const updatedSource = payload.new as AgentSource;
          setChildSources(prev => prev.map(source => 
            source.id === updatedSource.id ? updatedSource : source
          ));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [parentSourceId]);

  const renderChildSource = (childSource: AgentSource) => (
    <div key={childSource.id} className="flex items-center justify-between p-3 pl-16 hover:bg-gray-100 transition-colors">
      <div className="flex items-center flex-1">
        <input 
          type="checkbox" 
          className="rounded border-gray-300 text-black focus:ring-black mr-4" 
        />
        <WebsiteSourceInfo
          title={childSource.title}
          url={childSource.url}
          createdAt={childSource.created_at}
          lastCrawledAt={childSource.last_crawled_at}
          crawlStatus={childSource.crawl_status}
          metadata={childSource.metadata}
          content={childSource.content}
          isChild={true}
        />
        <WebsiteSourceStatus 
          sourceId={childSource.id}
          status={childSource.crawl_status} 
          isChild={true}
        />
      </div>
      
      <WebsiteSourceActions
        source={childSource}
        onEdit={onEdit}
        onExclude={onExclude}
        onDelete={onDelete}
        onRecrawl={onRecrawl}
        showRecrawl={false}
        isChild={true}
      />
    </div>
  );

  return (
    <div className="border-t border-gray-200 bg-gray-50">
      {/* Show child sources or loading states */}
      {childSources.length > 0 || isCrawling ? (
        <ScrollArea className="max-h-80">
          <div className="divide-y divide-gray-100">
            {/* Render existing child sources */}
            {childSources.map(renderChildSource)}

            {/* Show skeleton placeholders only while crawling and if we expect more sources */}
            {isCrawling && (
              <>
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="flex items-center justify-between p-3 pl-16">
                    <div className="flex items-center flex-1">
                      <Skeleton className="h-4 w-4 mr-4" />
                      <div className="flex items-center flex-1">
                        <Skeleton className="h-4 w-4 mr-3" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-48 mb-1" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-6 w-20 ml-4" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-8" />
                  </div>
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex items-center justify-center py-6 text-gray-500">
          <span>No links discovered</span>
        </div>
      )}
    </div>
  );
};

export default WebsiteChildSources;
