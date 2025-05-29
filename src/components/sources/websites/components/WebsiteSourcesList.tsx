
import React from 'react';
import { AgentSource } from '@/types/rag';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import WebsiteSourceItem from '../WebsiteSourceItem';

interface WebsiteSourcesListProps {
  parentSources: AgentSource[];
  getChildSources: (parentId: string) => AgentSource[];
  onEdit: (sourceId: string, newUrl: string) => void;
  onExclude: (source: AgentSource) => void;
  onDelete: (source: AgentSource) => void;
  onRecrawl: (source: AgentSource) => void;
  loading: boolean;
  error: string | null;
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
      <Card className="border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Website Sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <Skeleton className="h-4 w-4 mr-4" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20 ml-4" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading website sources: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Website Sources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {parentSources.map((source) => (
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
      </CardContent>
    </Card>
  );
};

export default WebsiteSourcesList;
