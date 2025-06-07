
import React from 'react';
import { AgentSource } from '@/types/rag';
import { WebsiteSourceItem } from '../WebsiteSourceItem';

interface WebsiteSourcesContentProps {
  sources: AgentSource[];
  getChildSources: (parentId: string) => AgentSource[];
  onEdit: (sourceId: string, newUrl: string) => void;
  onExclude: (source: AgentSource) => void;
  onDelete: (source: AgentSource) => void;
  onRecrawl: (source: AgentSource) => void;
  isSelected: (id: string) => boolean;
  toggleItem: (id: string) => void;
}

const WebsiteSourcesContent: React.FC<WebsiteSourcesContentProps> = ({
  sources,
  getChildSources,
  onEdit,
  onExclude,
  onDelete,
  onRecrawl,
  isSelected,
  toggleItem
}) => {
  console.log('🔍 DEBUG: WebsiteSourcesContent received sources:', {
    count: sources.length,
    sources: sources.map(s => ({
      id: s.id,
      title: s.title,
      pending_deletion: s.pending_deletion,
      is_excluded: s.is_excluded
    })),
    timestamp: new Date().toISOString()
  });

  if (sources.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No website sources found</p>
        <p className="text-sm">Add a website URL above to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sources.map((source) => {
        console.log(`🔍 DEBUG: Rendering source ${source.id}:`, {
          title: source.title,
          pending_deletion: source.pending_deletion,
          is_excluded: source.is_excluded,
          timestamp: new Date().toISOString()
        });
        
        return (
          <WebsiteSourceItem
            key={source.id}
            source={source}
            childSources={getChildSources(source.id)}
            onEdit={onEdit}
            onExclude={onExclude}
            onDelete={onDelete}
            onRecrawl={onRecrawl}
            isSelected={isSelected(source.id)}
            onSelectionChange={(selected) => {
              toggleItem(source.id);
            }}
          />
        );
      })}
    </div>
  );
};

export default WebsiteSourcesContent;
