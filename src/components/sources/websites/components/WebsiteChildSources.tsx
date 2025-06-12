
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useChildSourcesRealtime } from '../hooks/useChildSourcesRealtime';
import ChildPageCard from './ChildPageCard';
import { useSourcePagesPaginated } from '@/hooks/useSourcePagesPaginated';

interface WebsiteChildSourcesProps {
  parentSourceId: string;
  isCrawling?: boolean;
  onEdit: (sourceId: string, newUrl: string) => void;
  onExclude: (source: any) => void;
  onDelete: (source: any) => void;
  onRecrawl: (source: any) => void;
}

const WebsiteChildSources: React.FC<WebsiteChildSourcesProps> = ({
  parentSourceId,
  isCrawling = false,
  onExclude,
  onDelete
}) => {
  // Use the paginated hook for initial data and pagination
  const { data: pagesData, isLoading, refetch } = useSourcePagesPaginated({
    parentSourceId,
    page: 1,
    pageSize: 50, // Show more pages initially
    enabled: !!parentSourceId
  });

  // Use real-time updates to supplement the paginated data
  const realtimeChildSources = useChildSourcesRealtime(
    parentSourceId,
    pagesData?.pages || []
  );

  console.log('🔍 WebsiteChildSources Debug:', {
    parentSourceId,
    isCrawling,
    isLoading,
    pagesDataLength: pagesData?.pages?.length || 0,
    realtimeLength: realtimeChildSources.length,
    totalCount: pagesData?.totalCount || 0
  });

  // Use real-time data if available, otherwise fall back to paginated data
  const childPages = realtimeChildSources.length > 0 
    ? realtimeChildSources 
    : (pagesData?.pages || []);

  if (isLoading) {
    return (
      <div className="mt-4 p-4 flex justify-center items-center bg-gray-50 rounded-lg border">
        <Loader2 className="animate-spin mr-2" size={16} />
        <span>Loading child pages...</span>
      </div>
    );
  }

  if (childPages.length === 0) {
    return isCrawling ? (
      <div className="mt-4 p-4 text-sm text-gray-500 text-center bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="animate-spin" size={14} />
          <span>Crawling in progress. Child pages will appear here as they are discovered.</span>
        </div>
      </div>
    ) : (
      <div className="mt-4 p-4 text-sm text-gray-500 text-center bg-gray-50 rounded-lg border">
        No child pages found. Try refreshing or check if the crawl completed successfully.
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="text-sm font-medium mb-3 text-gray-700 flex items-center justify-between">
        <span>Child Pages ({childPages.length})</span>
        {isCrawling && (
          <div className="flex items-center gap-1 text-blue-600">
            <Loader2 className="animate-spin" size={12} />
            <span className="text-xs">Crawling...</span>
          </div>
        )}
      </div>
      <div className="relative bg-gray-50 rounded-lg border p-3">
        <ScrollArea className="h-96 w-full">
          <div className="space-y-2 pr-4">
            {childPages.map((page) => (
              <ChildPageCard
                key={page.id}
                page={page}
                onExclude={onExclude}
                onDelete={onDelete}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default WebsiteChildSources;
