
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ChevronDown, 
  ChevronRight
} from 'lucide-react';
import { AgentSource } from '@/types/rag';
import { supabase } from '@/integrations/supabase/client';
import WebsiteSourceInfo from './components/WebsiteSourceInfo';
import WebsiteSourceStatus from './components/WebsiteSourceStatus';
import WebsiteSourceActions from './components/WebsiteSourceActions';
import WebsiteChildSources from './components/WebsiteChildSources';

interface WebsiteSourceItemProps {
  source: AgentSource;
  childSources?: AgentSource[];
  onEdit: (sourceId: string, newUrl: string) => void;
  onExclude: (source: AgentSource) => void;
  onDelete: (source: AgentSource) => void;
  onRecrawl: (source: AgentSource) => void;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
}

const WebsiteSourceItem: React.FC<WebsiteSourceItemProps> = ({
  source,
  childSources = [],
  onEdit,
  onExclude,
  onDelete,
  onRecrawl,
  isSelected = false,
  onSelectionChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sourcePages, setSourcePages] = useState<any[]>([]);
  const [sourcePagesLoading, setSourcePagesLoading] = useState(false);
  
  const isParentSource = !source.parent_source_id;
  const showToggle = isParentSource;
  const isCrawling = source.crawl_status === 'in_progress' || source.crawl_status === 'pending';

  // Fetch source pages count for parent sources
  useEffect(() => {
    if (isParentSource) {
      fetchSourcePages();
    }
  }, [source.id, isParentSource]);

  const fetchSourcePages = async () => {
    setSourcePagesLoading(true);
    try {
      const { data, error } = await supabase
        .from('source_pages')
        .select('id, status')
        .eq('parent_source_id', source.id);

      if (error) {
        console.error('Error fetching source pages:', error);
        return;
      }

      setSourcePages(data || []);
    } catch (error) {
      console.error('Error in fetchSourcePages:', error);
    } finally {
      setSourcePagesLoading(false);
    }
  };

  // Real-time subscription for source_pages changes
  useEffect(() => {
    if (!isParentSource) return;

    const channel = supabase
      .channel(`source-pages-count-${source.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'source_pages',
          filter: `parent_source_id=eq.${source.id}`
        },
        () => {
          // Refetch source pages when changes occur
          fetchSourcePages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [source.id, isParentSource]);

  const hasSourcePages = sourcePages.length > 0;

  return (
    <div className="border border-gray-200 rounded-lg">
      {/* Main source item with fixed width container */}
      <div className="flex items-center justify-between p-4 min-h-[60px]">
        <div className="flex items-center flex-1 min-w-0 pr-4">
          <Checkbox 
            checked={isSelected}
            onCheckedChange={onSelectionChange}
            className="rounded border-gray-300 text-black focus:ring-black mr-4 flex-shrink-0"
            aria-label={`Select ${source.title || source.url}`}
          />
          
          <div className="flex-1 min-w-0 max-w-none">
            <WebsiteSourceInfo
              title={source.title}
              url={source.url}
              createdAt={source.created_at}
              linksCount={source.links_count}
              lastCrawledAt={source.last_crawled_at}
              crawlStatus={source.crawl_status}
              metadata={source.metadata}
              content={source.content}
              childSources={childSources}
              sourcePages={sourcePages}
            />
          </div>
          
          {/* Show status and progress with real-time updates */}
          <div className="ml-4 flex-shrink-0">
            <WebsiteSourceStatus
              sourceId={source.id}
              status={source.crawl_status}
              progress={source.progress}
              linksCount={sourcePages.length || source.links_count}
              metadata={source.metadata}
              showProgressBar={true}
              isChild={!isParentSource}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <WebsiteSourceActions
            source={source}
            onEdit={onEdit}
            onExclude={onExclude}
            onDelete={onDelete}
            onRecrawl={onRecrawl}
          />
          
          {showToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(!isExpanded)}
              disabled={!hasSourcePages && !isCrawling}
              aria-label={isExpanded ? "Collapse child sources" : "Expand child sources"}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </Button>
          )}
        </div>
      </div>
      
      {/* Child sources (crawled links) or loading state */}
      {isExpanded && (
        <WebsiteChildSources
          parentSourceId={source.id}
          isCrawling={isCrawling}
          onEdit={onEdit}
          onExclude={onExclude}
          onDelete={onDelete}
          onRecrawl={onRecrawl}
        />
      )}
    </div>
  );
};

export default WebsiteSourceItem;
