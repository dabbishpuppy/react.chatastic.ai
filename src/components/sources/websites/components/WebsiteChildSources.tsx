
import React from 'react';
import { Loader2 } from 'lucide-react';
import { AgentSource } from '@/types/rag';
import WebsiteSourceInfo from './WebsiteSourceInfo';
import WebsiteSourceStatus from './WebsiteSourceStatus';
import WebsiteSourceActions from './WebsiteSourceActions';

interface WebsiteChildSourcesProps {
  childSources: AgentSource[];
  isCrawling: boolean;
  onEdit: (source: AgentSource) => void;
  onExclude: (source: AgentSource) => void;
  onDelete: (source: AgentSource) => void;
  onRecrawl: (source: AgentSource) => void;
}

const WebsiteChildSources: React.FC<WebsiteChildSourcesProps> = ({
  childSources,
  isCrawling,
  onEdit,
  onExclude,
  onDelete,
  onRecrawl
}) => {
  return (
    <div className="border-t border-gray-200 bg-gray-50">
      {/* Show loading state if crawling in progress but no child sources yet */}
      {isCrawling && childSources.length === 0 && (
        <div className="flex items-center justify-center py-6 text-gray-500">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          <span>Crawling in progress...</span>
        </div>
      )}
      
      {/* Show child sources when available */}
      {childSources.map((childSource) => (
        <div key={childSource.id} className="flex items-center justify-between p-3 pl-16 border-b border-gray-100 last:border-b-0">
          <div className="flex items-center flex-1">
            <input 
              type="checkbox" 
              className="rounded border-gray-300 text-black focus:ring-black mr-4" 
            />
            <WebsiteSourceInfo
              title={childSource.title}
              url={childSource.url}
              createdAt={childSource.created_at}
              isChild={true}
            />
            <WebsiteSourceStatus status={childSource.crawl_status} />
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
      ))}
      
      {/* Show message if no child sources and not loading */}
      {!isCrawling && childSources.length === 0 && (
        <div className="flex items-center justify-center py-6 text-gray-500">
          <span>No links discovered</span>
        </div>
      )}
    </div>
  );
};

export default WebsiteChildSources;
