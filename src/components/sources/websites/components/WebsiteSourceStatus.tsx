
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WebsiteSourceStatusProps {
  sourceId?: string;
  status?: string;
  progress?: number;
  linksCount?: number;
  metadata?: any;
  showProgressBar?: boolean;
  isChild?: boolean;
}

const WebsiteSourceStatus: React.FC<WebsiteSourceStatusProps> = ({
  sourceId,
  status,
  progress,
  linksCount = 0,
  metadata,
  showProgressBar = false,
  isChild = false
}) => {
  const [realtimeData, setRealtimeData] = useState({
    status: status,
    progress: progress,
    linksCount: linksCount,
    metadata: metadata
  });
  const [isStalled, setIsStalled] = useState(false);

  // Set up real-time subscription for this source
  useEffect(() => {
    if (!sourceId) return;

    const channel = supabase
      .channel(`source-${sourceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_sources',
          filter: `id=eq.${sourceId}`
        },
        (payload) => {
          console.log('Real-time update:', payload);
          const newData = payload.new as any;
          setRealtimeData({
            status: newData.crawl_status,
            progress: newData.progress,
            linksCount: newData.links_count,
            metadata: newData.metadata
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sourceId]);

  // Detect stalled crawling
  useEffect(() => {
    if (realtimeData.status !== 'in_progress') {
      setIsStalled(false);
      return;
    }

    const stallTimer = setTimeout(() => {
      setIsStalled(true);
    }, 30000); // Consider stalled after 30 seconds without updates

    return () => clearTimeout(stallTimer);
  }, [realtimeData.status, realtimeData.progress, realtimeData.linksCount]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return isStalled ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status?: string) => {
    const maxPages = realtimeData.metadata?.max_pages || 1000;
    const currentCount = realtimeData.linksCount || 0;

    switch (status) {
      case 'completed':
        if (isChild) {
          return 'Completed';
        }
        return `Completed (${currentCount} pages)`;
      case 'in_progress': 
        if (isStalled) {
          return `Crawling stalled ${currentCount}/${maxPages}`;
        }
        return `Crawling ${currentCount}/${maxPages}`;
      case 'failed': 
        return 'Failed';
      case 'pending': 
        return `Pending (${currentCount} found)`;
      default: 
        return 'Unknown';
    }
  };

  const isCrawling = realtimeData.status === 'in_progress' || realtimeData.status === 'pending';

  return (
    <div className="flex items-center gap-2">
      <Badge className={getStatusColor(realtimeData.status)}>
        {isCrawling && (
          <>
            {isStalled ? (
              <AlertTriangle size={14} className="mr-1" />
            ) : (
              <Loader2 size={14} className="mr-1 animate-spin" />
            )}
          </>
        )}
        {getStatusText(realtimeData.status)}
      </Badge>
      
      {showProgressBar && realtimeData.status === 'in_progress' && realtimeData.progress && (
        <div className="w-20 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              isStalled ? 'bg-yellow-600' : 'bg-blue-600'
            }`}
            style={{ width: `${realtimeData.progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default WebsiteSourceStatus;
