
import React, { useMemo } from 'react';
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
  // Memoize total size calculation to prevent recalculation on every render
  const { totalSize, sizeText } = useMemo(() => {
    try {
      let totalBytes = 0;
      
      parentSources.forEach(parent => {
        // Add parent content size
        if (parent.content) {
          totalBytes += new Blob([parent.content]).size;
        }
        if (parent.metadata?.total_content_size) {
          totalBytes += parent.metadata.total_content_size;
        }
        
        // Add child sources content size
        const children = getChildSources(parent.id);
        children.forEach(child => {
          if (child.content) {
            totalBytes += new Blob([child.content]).size;
          }
          if (child.metadata?.content_size) {
            totalBytes += child.metadata.content_size;
          }
        });
      });
      
      const formatSize = (bytes: number) => {
        if (bytes === 0) return '';
        if (bytes < 1024) return ` • ${bytes}B`;
        if (bytes < 1024 * 1024) return ` • ${Math.round(bytes / 1024)}KB`;
        return ` • ${Math.round(bytes / (1024 * 1024))}MB`;
      };

      return {
        totalSize: totalBytes,
        sizeText: formatSize(totalBytes)
      };
    } catch (error) {
      console.error('Error calculating total size:', error);
      return {
        totalSize: 0,
        sizeText: ''
      };
    }
  }, [parentSources, getChildSources]);

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
          Link sources ({parentSources.length}){sizeText}
        </label>
      </div>
      
      <div className="space-y-3">
        {parentSources.map(source => {
          const childSources = getChildSources(source.id);
          return (
            <WebsiteSourceItem
              key={source.id}
              source={source}
              childSources={childSources}
              onEdit={onEdit}
              onExclude={onExclude}
              onDelete={onDelete}
              onRecrawl={onRecrawl}
            />
          );
        })}
      </div>
    </div>
  );
};

export default WebsiteSourcesList;
