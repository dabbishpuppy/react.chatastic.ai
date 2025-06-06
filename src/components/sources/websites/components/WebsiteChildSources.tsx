
import React from 'react';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AgentSource } from '@/types/rag';
import { useSourcePagesPaginated } from '@/hooks/useSourcePagesPaginated';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SourcePageItem from './SourcePageItem';

interface WebsiteChildSourcesProps {
  parentSourceId: string;
  isCrawling?: boolean;
  onEdit: (sourceId: string, newUrl: string) => void;
  onExclude: (source: AgentSource) => void;
  onDelete: (source: AgentSource) => void;
  onRecrawl: (source: AgentSource) => void;
}

const WebsiteChildSources: React.FC<WebsiteChildSourcesProps> = ({
  parentSourceId,
  isCrawling = false,
}) => {
  const { data: paginatedData, isLoading, error, refetch } = useSourcePagesPaginated({
    parentSourceId,
    page: 1,
    pageSize: 50,
    enabled: !!parentSourceId
  });

  const handleRetry = () => {
    refetch();
  };

  const handleDeletePage = async (pageId: string) => {
    try {
      const { error } = await supabase
        .from('source_pages')
        .delete()
        .eq('id', pageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Page deleted successfully",
      });

      refetch();
    } catch (error) {
      console.error('Error deleting page:', error);
      toast({
        title: "Error",
        description: "Failed to delete page",
        variant: "destructive",
      });
    }
  };

  const handleRecrawlPage = async (pageId: string) => {
    try {
      const { error } = await supabase
        .from('source_pages')
        .update({
          status: 'pending',
          error_message: null,
          content_size: null,
          chunks_created: null,
          processing_time_ms: null,
          completed_at: null
        })
        .eq('id', pageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Page recrawl initiated",
      });

      refetch();
    } catch (error) {
      console.error('Error recrawling page:', error);
      toast({
        title: "Error",
        description: "Failed to initiate page recrawl",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="mt-4 p-4 flex justify-center items-center">
        <Loader2 className="animate-spin mr-2" size={16} />
        <span>Loading child pages...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-4 text-sm text-red-500 border border-red-200 rounded bg-red-50">
        <p className="font-medium">Error loading child pages</p>
        <p className="text-xs mt-1">{error.message}</p>
        <button 
          onClick={handleRetry} 
          className="mt-2 text-xs underline text-blue-600"
        >
          Try again
        </button>
      </div>
    );
  }

  const childPages = paginatedData?.pages || [];

  if (childPages.length === 0) {
    return isCrawling ? (
      <div className="mt-4 p-4 text-sm text-gray-500 text-center">
        Crawling in progress. Child pages will appear here as they are discovered.
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
      <ScrollArea className="max-h-64">
        <div className="space-y-2 pr-2">
          {childPages.map((page) => (
            <SourcePageItem
              key={page.id}
              page={page}
              onDelete={handleDeletePage}
              onRecrawl={handleRecrawlPage}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default WebsiteChildSources;
