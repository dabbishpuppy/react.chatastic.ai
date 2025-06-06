
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AgentSource } from '@/types/rag';
import { WebsiteSourceItem } from '../WebsiteSourceItem';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface WebsiteChildSourcesProps {
  parentSourceId: string;
  isCrawling?: boolean;
  onEdit: (sourceId: string, newUrl: string) => void;
  onExclude: (source: AgentSource) => void;
  onDelete: (source: AgentSource) => void;
  onRecrawl: (source: AgentSource) => void;
}

interface SourcePage {
  id: string;
  url: string;
  status: string;
  created_at: string;
  parent_source_id: string;
  content_size?: number;
  compression_ratio?: number;
  error_message?: string;
}

const WebsiteChildSources: React.FC<WebsiteChildSourcesProps> = ({
  parentSourceId,
  isCrawling = false,
  onEdit,
  onExclude,
  onDelete,
  onRecrawl
}) => {
  const [childSources, setChildSources] = useState<AgentSource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchChildSources = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Query source_pages table instead of agent_sources
      const { data: sourcePages, error } = await supabase
        .from('source_pages')
        .select('*')
        .eq('parent_source_id', parentSourceId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching child sources:', error);
        setError(`Failed to fetch child pages: ${error.message}`);
        return;
      }

      if (!sourcePages || sourcePages.length === 0) {
        setChildSources([]);
        return;
      }

      // Convert source_pages to AgentSource format for compatibility with existing components
      const formattedSources: AgentSource[] = (sourcePages as SourcePage[]).map(page => ({
        id: page.id,
        url: page.url,
        title: new URL(page.url).pathname || page.url,
        crawl_status: page.status,
        created_at: page.created_at,
        updated_at: page.created_at, // Use created_at as updated_at since source_pages doesn't have updated_at
        parent_source_id: page.parent_source_id,
        agent_id: '', // Not needed for child display
        source_type: 'website',
        is_active: true,
        is_excluded: false, // Default value
        original_size: page.content_size || 0,
        compressed_size: page.content_size ? Math.round(page.content_size * (page.compression_ratio || 1)) : 0,
        metadata: { error_message: page.error_message } as Record<string, any>,
        requires_manual_training: false // Add the required field
      }));
      
      setChildSources(formattedSources);
    } catch (err: any) {
      console.error('Exception fetching child sources:', err);
      setError(`Error loading child pages: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildSources();
    
    // Set up realtime subscription for source_pages changes
    const subscription = supabase
      .channel(`source-pages-${parentSourceId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'source_pages',
        filter: `parent_source_id=eq.${parentSourceId}` 
      }, (payload) => {
        console.log('📡 Source page update received:', payload);
        fetchChildSources();
      })
      .subscribe((status) => {
        console.log(`📡 Source pages subscription status: ${status}`);
        if (status === 'CHANNEL_ERROR') {
          console.error('Error with source pages subscription');
          setError('Real-time updates disconnected');
        }
      });
      
    return () => {
      subscription.unsubscribe();
    };
  }, [parentSourceId]);

  const handleSelectionChange = (sourceId: string, selected?: boolean) => {
    const newSelected = new Set(selectedSources);
    
    if (selected) {
      newSelected.add(sourceId);
    } else {
      newSelected.delete(sourceId);
    }
    
    setSelectedSources(newSelected);
  };

  if (loading) {
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
        <p className="text-xs mt-1">{error}</p>
        <button 
          onClick={fetchChildSources} 
          className="mt-2 text-xs underline text-blue-600"
        >
          Try again
        </button>
      </div>
    );
  }

  if (childSources.length === 0) {
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
        Child Pages ({childSources.length})
      </div>
      <div className="space-y-2">
        {childSources.map((source) => (
          <Card key={source.id} className="shadow-sm">
            <CardContent className="p-3">
              <WebsiteSourceItem
                source={source}
                onEdit={onEdit}
                onExclude={onExclude}
                onDelete={onDelete}
                onRecrawl={onRecrawl}
                isSelected={selectedSources.has(source.id)}
                onSelectionChange={(selected) => handleSelectionChange(source.id, selected)}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WebsiteChildSources;
