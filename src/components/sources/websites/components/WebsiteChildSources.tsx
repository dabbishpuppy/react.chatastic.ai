
import React from 'react';
import { useOptimizedAgentSources } from '@/hooks/useOptimizedAgentSources';
import { AgentSource } from '@/types/rag';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import WebsiteSourceHeader from './WebsiteSourceHeader';
import WebsiteSourceActions from './WebsiteSourceActions';
import { Skeleton } from '@/components/ui/skeleton';

interface WebsiteChildSourcesProps {
  parentSourceId: string;
  isCrawling: boolean;
  onEdit: (sourceId: string, newUrl: string) => void;
  onExclude: (source: AgentSource) => void;
  onDelete: (source: AgentSource) => void;
  onRecrawl: (source: AgentSource) => void;
}

const WebsiteChildSources: React.FC<WebsiteChildSourcesProps> = ({
  parentSourceId,
  isCrawling,
  onEdit,
  onExclude,
  onDelete,
  onRecrawl
}) => {
  const { sources: allSources, loading: isLoading } = useOptimizedAgentSources();

  // Filter child sources for this parent
  const childSources = allSources?.filter(source => 
    source.parent_source_id === parentSourceId &&
    source.source_type === 'website'
  ) || [];

  if (isLoading) {
    return (
      <div className="mt-4 pl-6 space-y-2">
        <div className="text-sm text-gray-600 mb-2">Loading child sources...</div>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="border border-gray-100">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <Skeleton className="h-4 w-4 mr-3" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (childSources.length === 0) {
    return (
      <div className="mt-4 pl-6">
        <div className="text-sm text-gray-500">
          {isCrawling ? 'Discovering links...' : 'No child sources found'}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 pl-6">
      <div className="text-sm text-gray-600 mb-2">
        Child Sources ({childSources.length})
      </div>
      <div className="space-y-2">
        {childSources.map((childSource) => (
          <Card key={childSource.id} className="border border-gray-100">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <WebsiteSourceHeader
                  source={childSource}
                  childSources={[]}
                  isSelected={false}
                  isEditing={false}
                  editUrl={childSource.url}
                  onSelectionChange={() => {}}
                  onEditUrlChange={() => {}}
                  onSaveEdit={() => {}}
                  onCancelEdit={() => {}}
                />
                
                <WebsiteSourceActions
                  source={childSource}
                  onEdit={() => onEdit(childSource.id, childSource.url)}
                  onExclude={() => onExclude(childSource)}
                  onRecrawl={() => onRecrawl(childSource)}
                  onDelete={() => onDelete(childSource)}
                  isChild={true}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WebsiteChildSources;
