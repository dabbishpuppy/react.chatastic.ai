
import React, { useEffect, useState } from 'react';
import { AgentSource } from '@/types/rag';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import WebsiteSourceInfo from './WebsiteSourceInfo';
import WebsiteSourceStatus from './WebsiteSourceStatus';
import WebsiteSourceActions from './WebsiteSourceActions';

interface WebsiteChildSourcesProps {
  childSources: AgentSource[];
  parentSourceId: string;
  isCrawling: boolean;
  onEdit: (sourceId: string, newUrl: string) => void;
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

  // Update local state when props change
  useEffect(() => {
    setChildSources(initialChildSources);
  }, [initialChildSources]);

  // Real-time subscription for child sources of this parent
  useEffect(() => {
    if (!parentSourceId) return;

    console.log(`🔄 Setting up child sources subscription for parent: ${parentSourceId}`);

    const channel = supabase
      .channel(`child-sources-${parentSourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sources',
          filter: `parent_source_id=eq.${parentSourceId}`
        },
        (payload) => {
          console.log('📡 Child source update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newSource = payload.new as AgentSource;
            setChildSources(prev => {
              // Check if source already exists to avoid duplicates
              const exists = prev.some(source => source.id === newSource.id);
              if (!exists) {
                return [...prev, newSource];
              }
              return prev;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedSource = payload.new as AgentSource;
            setChildSources(prev => 
              prev.map(source => 
                source.id === updatedSource.id ? updatedSource : source
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedSource = payload.old as AgentSource;
            setChildSources(prev => 
              prev.filter(source => source.id !== deletedSource.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up child sources subscription');
      supabase.removeChannel(channel);
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
                <div className="p-3 pl-16 text-sm text-gray-500 text-center">
                  Discovering and crawling new links...
                </div>
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
