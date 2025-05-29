
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, 
  ChevronRight
} from 'lucide-react';
import { AgentSource } from '@/types/rag';
import WebsiteSourceInfo from './components/WebsiteSourceInfo';
import WebsiteSourceStatus from './components/WebsiteSourceStatus';
import WebsiteSourceActions from './components/WebsiteSourceActions';
import WebsiteChildSources from './components/WebsiteChildSources';

interface WebsiteSourceItemProps {
  source: AgentSource;
  childSources?: AgentSource[];
  onEdit: (source: AgentSource) => void;
  onExclude: (source: AgentSource) => void;
  onDelete: (source: AgentSource) => void;
  onRecrawl: (source: AgentSource) => void;
}

const WebsiteSourceItem: React.FC<WebsiteSourceItemProps> = ({
  source,
  childSources = [],
  onEdit,
  onExclude,
  onDelete,
  onRecrawl
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isParentSource = !source.parent_source_id;
  const showToggle = isParentSource;
  const hasChildSources = childSources.length > 0;
  const isCrawling = source.crawl_status === 'in_progress' || source.crawl_status === 'pending';

  return (
    <div className="border border-gray-200 rounded-lg">
      {/* Main source item */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center flex-1">
          <input 
            type="checkbox" 
            className="rounded border-gray-300 text-black focus:ring-black mr-4" 
          />
          
          {showToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 mr-2"
              onClick={() => setIsExpanded(!isExpanded)}
              disabled={!hasChildSources && !isCrawling}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </Button>
          )}
          
          <WebsiteSourceInfo
            title={source.title}
            url={source.url}
            createdAt={source.created_at}
            linksCount={source.links_count}
            lastCrawledAt={source.last_crawled_at}
          />
          
          <WebsiteSourceStatus
            status={source.crawl_status}
            progress={source.progress}
            showProgressBar={true}
          />
        </div>
        
        <WebsiteSourceActions
          source={source}
          onEdit={onEdit}
          onExclude={onExclude}
          onDelete={onDelete}
          onRecrawl={onRecrawl}
        />
      </div>
      
      {/* Child sources (crawled links) or loading state */}
      {isExpanded && (
        <WebsiteChildSources
          childSources={childSources}
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
