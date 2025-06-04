
import React, { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import WebsiteSourceActions from './WebsiteSourceActions';

interface SourcePage {
  id: string;
  url: string;
  status: string;
  processing_status?: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  content_size?: number;
  chunks_created?: number;
  processing_time_ms?: number;
  compression_ratio?: number;
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

  // Enhanced format size with better compression detection and no "0" display
  const formatSize = (contentSize?: number, compressionRatio?: number) => {
    if (!contentSize || contentSize <= 0) return null;

    // Only show compression info if we have a meaningful compression ratio
    if (compressionRatio && compressionRatio > 0 && compressionRatio < 0.95) {
      const compressedSize = Math.round(contentSize * compressionRatio);
      const savings = Math.round((1 - compressionRatio) * 100);
      
      // Only show compression info if savings are significant (>= 10%)
      if (savings >= 10) {
        const formattedSize = compressedSize < 1024 ? `${compressedSize} B` : `${Math.round(compressedSize / 1024)} KB`;
        return {
          size: formattedSize,
          isCompressed: true,
          savings: savings,
          compressionLevel: savings >= 80 ? 'ultra' : savings >= 60 ? 'high' : 'standard'
        };
      }
    }

    // Show original size without compression info
    const size = contentSize < 1024 ? `${contentSize} B` : `${Math.round(contentSize / 1024)} KB`;
    return {
      size,
      isCompressed: false,
      savings: null,
      compressionLevel: null
    };
  };

  // Update parent metadata after deletion
  const updateParentMetadata = async () => {
    try {
      // Get current child pages count and stats
      const { data: currentPages, error } = await supabase
        .from('source_pages')
        .select('status, processing_status')
        .eq('parent_source_id', parentSourceId);

      if (error) {
        console.error('Error fetching child pages for metadata update:', error);
        return;
      }

      const totalPages = currentPages?.length || 0;
      const completedPages = currentPages?.filter(p => p.status === 'completed').length || 0;
      const failedPages = currentPages?.filter(p => p.status === 'failed').length || 0;
      const pendingPages = currentPages?.filter(p => p.status === 'pending').length || 0;
      const inProgressPages = currentPages?.filter(p => p.status === 'in_progress').length || 0;
      
      // Count processed vs unprocessed pages
      const processedPages = currentPages?.filter(p => p.processing_status === 'processed').length || 0;
      const unprocessedPages = currentPages?.filter(p => p.status === 'completed' && p.processing_status === 'pending').length || 0;

      // Calculate progress
      const progress = totalPages > 0 ? Math.round((completedPages / totalPages) * 100) : 0;

      // Determine if manual training is required
      const requiresManualTraining = unprocessedPages > 0;

      // Update parent source
      const { error: updateError } = await supabase
        .from('agent_sources')
        .update({
          links_count: totalPages,
          progress: progress,
          requires_manual_training: requiresManualTraining,
          metadata: {
            total_children: totalPages,
            children_completed: completedPages,
            children_failed: failedPages,
            children_pending: pendingPages,
            children_in_progress: inProgressPages,
            children_processed: processedPages,
            children_unprocessed: unprocessedPages,
            last_metadata_update: new Date().toISOString()
          }
        })
        .eq('id', parentSourceId);

      if (updateError) {
        console.error('Error updating parent metadata:', updateError);
      } else {
        console.log('✅ Parent metadata updated after child deletion');
      }
    } catch (error) {
      console.error('Error in updateParentMetadata:', error);
    }
  };

  // Enhanced fetch with error handling and retries
  const fetchChildPages = async (retryCount = 0) => {
    try {
      console.log(`📄 Fetching child pages for parent ${parentSourceId}, attempt ${retryCount + 1}`);
      
      const { data, error } = await supabase
        .from('source_pages')
        .select('*')
        .eq('parent_source_id', parentSourceId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching child pages:', error);
        
        // Retry up to 3 times for network errors
        if (retryCount < 3 && (error.message?.includes('502') || error.message?.includes('504'))) {
          console.log(`🔄 Retrying fetch in 2 seconds (attempt ${retryCount + 1}/3)`);
          setTimeout(() => fetchChildPages(retryCount + 1), 2000);
          return;
        }
        
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} child pages`);
      setChildPages(data || []);
    } catch (error) {
      console.error('Error in fetchChildPages:', error);
    } finally {
      if (retryCount === 0) setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (parentSourceId) {
      fetchChildPages();
    }
  }, [parentSourceId]);

  // Enhanced real-time subscription with better error handling and type safety
  useEffect(() => {
    if (!parentSourceId) return;

    console.log(`📡 Setting up enhanced real-time subscription for parent: ${parentSourceId}`);

    const channel = supabase
      .channel(`source-pages-enhanced-${parentSourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'source_pages',
          filter: `parent_source_id=eq.${parentSourceId}`
        },
        (payload) => {
          // Type-safe property access
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          console.log('📡 Source page update received:', {
            event: payload.eventType,
            url: newRecord?.url || oldRecord?.url,
            status: newRecord?.status,
            processing_status: newRecord?.processing_status,
            contentSize: newRecord?.content_size,
            compressionRatio: newRecord?.compression_ratio,
            timestamp: new Date().toISOString()
          });
          
          if (payload.eventType === 'INSERT') {
            const newPage = newRecord as SourcePage;
            setChildPages(prev => {
              const exists = prev.some(page => page.id === newPage.id);
              if (!exists) {
                return [...prev, newPage];
              }
              return prev;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedPage = newRecord as SourcePage;
            setChildPages(prev => 
              prev.map(page => 
                page.id === updatedPage.id ? updatedPage : page
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedPage = oldRecord as SourcePage;
            setChildPages(prev => 
              prev.filter(page => page.id !== deletedPage.id)
            );
            // Update parent metadata when a child is deleted
            setTimeout(() => updateParentMetadata(), 100);
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Subscription status for ${parentSourceId}:`, status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Enhanced real-time subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error, retrying...');
          // Auto-retry after 5 seconds
          setTimeout(() => {
            supabase.removeChannel(channel);
            // Restart subscription
          }, 5000);
        }
      });

    return () => {
      console.log('🔌 Cleaning up enhanced real-time subscription');
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

  const getStatusBadge = (status: string, processingStatus?: string) => {
    const baseClasses = 'px-2 py-1 text-xs rounded-full font-medium';
    
    // Show processing status for completed crawls
    if (status === 'completed' && processingStatus) {
      if (processingStatus === 'processed') {
        return `${baseClasses} bg-green-100 text-green-800`;
      } else if (processingStatus === 'pending') {
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      } else if (processingStatus === 'failed') {
        return `${baseClasses} bg-red-100 text-red-800`;
      }
    }
    
    const colorClasses = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      in_progress: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    
    return `${baseClasses} ${colorClasses[status as keyof typeof colorClasses] || 'bg-gray-100 text-gray-800'}`;
  };

  const getStatusText = (status: string, processingStatus?: string) => {
    if (status === 'completed' && processingStatus) {
      if (processingStatus === 'processed') return 'trained';
      if (processingStatus === 'pending') return 'crawled';
      if (processingStatus === 'failed') return 'training failed';
    }
    return status.replace('_', ' ');
  };

  const handleDelete = async (page: SourcePage) => {
    try {
      const { error } = await supabase
        .from('source_pages')
        .delete()
        .eq('id', page.id);

      if (error) {
        console.error('Error deleting source page:', error);
        throw error;
      }

      setChildPages(prev => prev.filter(p => p.id !== page.id));
      
      console.log(`Successfully deleted source page: ${page.id}`);
      
      // Update parent metadata after successful deletion
      await updateParentMetadata();
    } catch (error) {
      console.error('Failed to delete source page:', error);
      fetchChildPages();
      throw error;
    }
  };

  const renderChildPage = (page: SourcePage) => {
    const sizeInfo = formatSize(page.content_size, page.compression_ratio);
    
    return (
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
            
            <div className="flex items-center text-xs text-gray-500">
              <span>Added {formatDistanceToNow(new Date(page.created_at), { addSuffix: true })}</span>
              
              {sizeInfo && (
                <>
                  <span className="mx-2">•</span>
                  <div className="flex items-center gap-1">
                    <span>{sizeInfo.size}</span>
                    {sizeInfo.isCompressed && (
                      <>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs px-1 py-0 h-4 ${
                            sizeInfo.compressionLevel === 'ultra' ? 'bg-purple-100 text-purple-800' :
                            sizeInfo.compressionLevel === 'high' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}
                        >
                          {sizeInfo.compressionLevel === 'ultra' ? 'Ultra' : 
                           sizeInfo.compressionLevel === 'high' ? 'High' : 'Compressed'}
                        </Badge>
                        <span className="text-green-600 font-medium">
                          ({sizeInfo.savings}% smaller)
                        </span>
                      </>
                    )}
                  </div>
                </>
              )}
              
              {page.chunks_created && page.chunks_created > 0 && (
                <>
                  <span className="mx-2">•</span>
                  <span>{page.chunks_created} chunks</span>
                </>
              )}
              
              {page.processing_time_ms && (
                <>
                  <span className="mx-2">•</span>
                  <span>{page.processing_time_ms}ms</span>
                </>
              )}
            </div>
            
            {page.error_message && (
              <p className="text-xs text-red-600 mt-1 truncate" title={page.error_message}>
                Error: {page.error_message}
              </p>
            )}
          </div>
          
          <div className="ml-4 flex-shrink-0">
            <span className={getStatusBadge(page.status, page.processing_status)}>
              {getStatusText(page.status, page.processing_status)}
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
            onEdit={() => onEdit(page.id, page.url)}
            onExclude={() => onExclude({
              id: page.id,
              url: page.url,
              title: page.url,
              source_type: 'website',
              agent_id: '',
              team_id: '',
              created_at: page.created_at,
              crawl_status: page.status,
              is_active: true
            })}
            onDelete={() => handleDelete(page)}
            onRecrawl={() => onRecrawl({
              id: page.id,
              url: page.url,
              title: page.url,
              source_type: 'website',
              agent_id: '',
              team_id: '',
              created_at: page.created_at,
              crawl_status: page.status,
              is_active: true
            })}
            isChild={true}
          />
        </div>
      </div>
    );
  };

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
