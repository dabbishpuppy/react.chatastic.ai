
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

  const fetchChildSources = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('agent_sources')
        .select('*')
        .eq('parent_source_id', parentSourceId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching child sources:', error);
      } else {
        // Properly cast the data to AgentSource type
        const typedData: AgentSource[] = (data || []).map(item => ({
          ...item,
          metadata: item.metadata as Record<string, any> || {}
        }));
        setChildSources(typedData);
      }
    } catch (err) {
      console.error('Exception fetching child sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildSources();
    
    // Set up realtime subscription for child sources
    const subscription = supabase
      .channel(`parent-source-${parentSourceId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'agent_sources',
        filter: `parent_source_id=eq.${parentSourceId}` 
      }, () => {
        fetchChildSources();
      })
      .subscribe();
      
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
        <span>Loading child sources...</span>
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
