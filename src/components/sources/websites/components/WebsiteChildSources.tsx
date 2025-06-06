
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useChildSourcesData } from '../hooks/useChildSourcesData';
import ChildPageCard from './ChildPageCard';

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
  const { childPages, loading } = useChildSourcesData(parentSourceId);

  if (loading) {
    return (
      <div className="mt-4 p-4 flex justify-center items-center">
        <Loader2 className="animate-spin mr-2" size={16} />
        <span>Loading child pages...</span>
      </div>
    );
  }

  if (childPages.length === 0) {
    return isCrawling ? (
      <div className="mt-4 p-4 text-sm text-gray-500 text-center">
        Crawling in progress. Child pages will appear here.
      </div>
    ) : (
      <div className="mt-4 p-4 text-sm text-gray-500 text-center">
        No child pages found.
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="text-sm font-medium mb-2 text-gray-700">
        Child Pages ({childPages.length})
      </div>
      <div className="relative">
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
