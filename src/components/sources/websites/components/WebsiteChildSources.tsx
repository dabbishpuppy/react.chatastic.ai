
import React, { useState, useEffect } from 'react';
import { AgentSource } from '@/types/rag';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import WorkflowStatusBadge from './WorkflowStatusBadge';
import WebsiteSourceActions from './WebsiteSourceActions';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChildSources = async () => {
      try {
        const { data, error } = await supabase
          .from('agent_sources')
          .select('*')
          .eq('parent_source_id', parentSourceId)
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching child sources:', error);
          return;
        }

        // Transform the data to match AgentSource type
        const transformedData: AgentSource[] = (data || []).map(item => ({
          ...item,
          workflow_metadata: typeof item.workflow_metadata === 'string' 
            ? JSON.parse(item.workflow_metadata) 
            : (item.workflow_metadata || {})
        }));

        setChildSources(transformedData);
      } catch (error) {
        console.error('Error in fetchChildSources:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChildSources();

    // Set up real-time subscription for child sources
    const channel = supabase
      .channel(`child-sources-${parentSourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sources',
          filter: `parent_source_id=eq.${parentSourceId}`
        },
        () => {
          fetchChildSources();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parentSourceId]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between p-2 border border-gray-200 rounded">
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (childSources.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        {isCrawling ? 'Discovering pages...' : 'No child pages found'}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {childSources.map((childSource) => (
        <div
          key={childSource.id}
          className="flex items-center justify-between p-2 border border-gray-200 rounded hover:bg-gray-50"
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {childSource.title || childSource.url}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {childSource.url}
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-2">
            <WorkflowStatusBadge
              status={childSource.crawl_status || 'pending'}
              workflowStatus={childSource.workflow_status}
            />
            
            <WebsiteSourceActions
              source={childSource}
              onEdit={(sourceId, newUrl) => onEdit(sourceId, newUrl)}
              onExclude={(source) => onExclude(source)}
              onRecrawl={(source) => onRecrawl(source)}
              onDelete={(source) => onDelete(source)}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default WebsiteChildSources;
