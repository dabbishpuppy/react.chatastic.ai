
import React, { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import WebsiteSourceActions from './WebsiteSourceActions';

interface SourcePage {
  id: string;
  url: string;
  status: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  content_size?: number;
  chunks_created?: number;
  processing_time_ms?: number;
}

interface WebsiteChildSourcesProps {
  parentSourceId: string;
  isCrawling: boolean;
  onEdit: (sourceId: string, newUrl: string) => void;
  onExclude: (source: any) => void;
  onDelete: (source: any) => void;
  onRecrawl: (source: any) => void;
}

const WebsiteChildSources: React.FC<WebsiteChildSourcesProps> = ({
  parentSourceId,
  isCrawling,
  onEdit,
  onExclude,
  onDelete,
  onRecrawl
}) => {
  const [childPages, setChildPages] = useState<SourcePage[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch child pages from source_pages table
  const fetchChildPages = async () => {
    try {
      const { data, error } = await supabase
        .from('source_pages')
        .select('*')
        .eq('parent_source_id', parentSourceId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching child pages:', error);
        return;
      }

      setChildPages(data || []);
    } catch (error) {
      console.error('Error in fetchChildPages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (parentSourceId) {
      fetchChildPages();
    }
  }, [parentSourceId]);

  // Real-time subscription for source_pages changes
  useEffect(() => {
    if (!parentSourceId) return;

    console.log(`📡 Setting up source_pages subscription for parent: ${parentSourceId}`);

    const channel = supabase
      .channel(`source-pages-${parentSourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'source_pages',
          filter: `parent_source_id=eq.${parentSourceId}`
        },
        (payload) => {
          console.log('📡 Source page update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newPage = payload.new as SourcePage;
            setChildPages(prev => {
              const exists = prev.some(page => page.id === newPage.id);
              if (!exists) {
                return [...prev, newPage];
              }
              return prev;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedPage = payload.new as SourcePage;
            setChildPages(prev => 
              prev.map(page => 
                page.id === updatedPage.id ? updatedPage : page
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedPage = payload.old as SourcePage;
            setChildPages(prev => 
              prev.filter(page => page.id !== deletedPage.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up source_pages subscription');
      supabase.removeChannel(channel);
    };
  }, [parentSourceId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'in_progress':
        return 'text-blue-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 text-xs rounded-full font-medium';
    const colorClasses = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      in_progress: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    
    return `${baseClasses} ${colorClasses[status as keyof typeof colorClasses] || 'bg-gray-100 text-gray-800'}`;
  };

  const renderChildPage = (page: SourcePage) => (
    <div key={page.id} className="flex items-center justify-between p-3 pl-16 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0">
      <div className="flex items-center flex-1 min-w-0">
        <input 
          type="checkbox" 
          className="rounded border-gray-300 text-black focus:ring-black mr-4 flex-shrink-0" 
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-gray-900 truncate" title={page.url}>
              {page.url}
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Added {formatDistanceToNow(new Date(page.created_at), { addSuffix: true })}</span>
            {page.content_size && (
              <span>{Math.round(page.content_size / 1024)} KB</span>
            )}
            {page.chunks_created && page.chunks_created > 0 && (
              <span>{page.chunks_created} chunks</span>
            )}
            {page.processing_time_ms && (
              <span>{page.processing_time_ms}ms</span>
            )}
          </div>
          
          {page.error_message && (
            <p className="text-xs text-red-600 mt-1 truncate" title={page.error_message}>
              Error: {page.error_message}
            </p>
          )}
        </div>
        
        <div className="ml-4 flex-shrink-0">
          <span className={getStatusBadge(page.status)}>
            {page.status.replace('_', ' ')}
          </span>
        </div>
      </div>
      
      <div className="ml-4 flex-shrink-0">
        <WebsiteSourceActions
          source={{
            id: page.id,
            url: page.url,
            title: page.url,
            source_type: 'website',
            agent_id: '',
            team_id: '',
            created_at: page.created_at,
            crawl_status: page.status,
            is_active: true
          } as any}
          onEdit={onEdit}
          onExclude={onExclude}
          onDelete={onDelete}
          onRecrawl={onRecrawl}
          showRecrawl={false}
          isChild={true}
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="border-t border-gray-200 bg-gray-50">
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`skeleton-${index}`} className="flex items-center justify-between p-3 pl-16">
              <div className="flex items-center flex-1">
                <Skeleton className="h-4 w-4 mr-4" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 ml-4" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50">
      {childPages.length > 0 || isCrawling ? (
        <ScrollArea className="max-h-80">
          <div className="divide-y divide-gray-100">
            {childPages.map(renderChildPage)}

            {isCrawling && childPages.length === 0 && (
              <div className="p-3 pl-16 text-sm text-gray-500 text-center">
                Discovering and crawling new links...
              </div>
            )}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex items-center justify-center py-6 text-gray-500">
          <span>No links discovered</span>
        </div>
      )}
    </div>
  );
};

export default WebsiteChildSources;
