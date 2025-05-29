
import React from 'react';
import { Loader2 } from 'lucide-react';
import { AgentSource } from '@/types/rag';
import WebsiteSourceItem from '../WebsiteSourceItem';

interface WebsiteSourcesListProps {
  parentSources: AgentSource[];
  getChildSources: (parentId: string) => AgentSource[];
  onEdit: (source: AgentSource) => void;
  onExclude: (source: AgentSource) => void;
  onDelete: (source: AgentSource) => void;
  onRecrawl: (source: AgentSource) => void;
  loading: boolean;
  error?: string | null;
}

const WebsiteSourcesList: React.FC<WebsiteSourcesListProps> = ({
  parentSources,
  getChildSources,
  onEdit,
  onExclude,
  onDelete,
  onRecrawl,
  loading,
  error
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 mr-2 animate-spin text-gray-500" />
        <div className="text-gray-500">Loading website sources...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        Error loading website sources: {error}
      </div>
    );
  }

  if (parentSources.length === 0) {
    return (
      <div className="text-center text-gray-500 p-8">
        <p>No website sources found</p>
        <p className="text-sm mt-1">Add your first website source using the form above</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center mb-3">
        <input type="checkbox" id="select-all" className="rounded border-gray-300 text-black focus:ring-black mr-2" />
        <label htmlFor="select-all" className="text-lg font-medium">
          Link sources ({parentSources.length})
        </label>
      </div>
      
      <div className="space-y-3">
        {parentSources.map(source => (
          <WebsiteSourceItem
            key={source.id}
            source={source}
            childSources={getChildSources(source.id)}
            onEdit={onEdit}
            onExclude={onExclude}
            onDelete={onDelete}
            onRecrawl={onRecrawl}
          />
        ))}
      </div>
    </div>
  );
};

export default WebsiteSourcesList;
