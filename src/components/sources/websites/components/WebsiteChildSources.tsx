
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ExternalLink, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  parent_source_id: string;
}

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
  onEdit,
  onExclude,
  onDelete,
  onRecrawl
}) => {
  const [childPages, setChildPages] = useState<SourcePage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());

  const fetchChildPages = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('source_pages')
        .select('*')
        .eq('parent_source_id', parentSourceId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching child pages:', error);
      } else {
        setChildPages(data || []);
      }
    } catch (err) {
      console.error('Exception fetching child pages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildPages();
    
    // Set up optimized realtime subscription for source_pages
    const subscription = supabase
      .channel(`source-pages-${parentSourceId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'source_pages',
        filter: `parent_source_id=eq.${parentSourceId}` 
      }, (payload) => {
        const newPage = payload.new as SourcePage;
        setChildPages(prev => {
          // Check if page already exists to prevent duplicates
          const exists = prev.some(page => page.id === newPage.id);
          if (exists) return prev;
          return [...prev, newPage];
        });
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'source_pages',
        filter: `parent_source_id=eq.${parentSourceId}` 
      }, (payload) => {
        const updatedPage = payload.new as SourcePage;
        setChildPages(prev => 
          prev.map(page => 
            page.id === updatedPage.id ? updatedPage : page
          )
        );
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'source_pages',
        filter: `parent_source_id=eq.${parentSourceId}` 
      }, (payload) => {
        const deletedPage = payload.old as SourcePage;
        setChildPages(prev => 
          prev.filter(page => page.id !== deletedPage.id)
        );
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [parentSourceId]);

  const handleSelectionChange = (pageId: string, selected?: boolean) => {
    const newSelected = new Set(selectedPages);
    
    if (selected) {
      newSelected.add(pageId);
    } else {
      newSelected.delete(pageId);
    }
    
    setSelectedPages(newSelected);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-white';
      case 'in_progress': return 'bg-blue-500 text-white';
      case 'pending': return 'bg-yellow-500 text-white';
      case 'failed': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return url;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    const size = bytes / Math.pow(k, i);
    const formattedSize = i === 0 ? size.toString() : size.toFixed(1);
    
    return `${formattedSize} ${sizes[i]}`;
  };

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
      <div className="space-y-2">
        {childPages.map((page) => (
          <Card key={page.id} className="shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Badge className={`${getStatusColor(page.status)} text-xs px-2 py-0`}>
                    {getStatusText(page.status)}
                  </Badge>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate" title={page.url}>
                      {formatUrl(page.url)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {page.content_size && (
                        <span>{formatBytes(page.content_size)}</span>
                      )}
                      {page.chunks_created && (
                        <span>• {page.chunks_created} chunks</span>
                      )}
                      {page.processing_time_ms && (
                        <span>• {page.processing_time_ms}ms</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(page.url, '_blank')}
                          className="h-6 w-6 p-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Open URL</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onExclude({ ...page, source_type: 'website' })}
                          className="h-6 w-6 p-0"
                        >
                          <EyeOff className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Exclude</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete({ ...page, source_type: 'website' })}
                          className="h-6 w-6 p-0 text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {page.error_message && (
                <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                  Error: {page.error_message}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WebsiteChildSources;
