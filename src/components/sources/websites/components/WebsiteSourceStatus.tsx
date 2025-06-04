
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
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
  linksCount = 0,
  metadata,
  isChild = false
}) => {
  const [realtimeData, setRealtimeData] = useState({
    status: status,
    linksCount: linksCount,
    metadata: metadata
  });

  // Enhanced logging for status changes
  useEffect(() => {
    if (sourceId) {
      console.log(`🔄 WebsiteSourceStatus initialized for source ${sourceId}:`, {
        status: realtimeData.status,
        linksCount: realtimeData.linksCount,
        timestamp: new Date().toISOString()
      });
    }
  }, [sourceId]);

  // Set up real-time subscription for this source
  useEffect(() => {
    if (!sourceId) return;

    console.log(`📡 Setting up real-time subscription for source: ${sourceId}`);

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
          const newData = payload.new as any;
          const oldStatus = realtimeData.status;
          const newStatus = newData.crawl_status;
          
          console.log(`📊 Status transition for source ${sourceId}:`, {
            from: oldStatus,
            to: newStatus,
            linksCount: newData.links_count,
            timestamp: new Date().toISOString()
          });
          
          setRealtimeData({
            status: newStatus,
            linksCount: newData.links_count,
            metadata: newData.metadata
          });
        }
      )
      .subscribe();

    return () => {
      console.log(`🔌 Cleaning up subscription for source: ${sourceId}`);
      supabase.removeChannel(channel);
    };
  }, [sourceId]);

  const getStatusConfig = (status?: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock size={14} className="mr-1" />,
          text: 'Pending',
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
      case 'in_progress':
        return {
          icon: <Loader2 size={14} className="mr-1 animate-spin" />,
          text: 'Crawling',
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'completed':
        return {
          icon: <CheckCircle size={14} className="mr-1" />,
          text: 'Completed',
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'failed':
        return {
          icon: <AlertTriangle size={14} className="mr-1" />,
          text: 'Failed',
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      default:
        return {
          icon: <Clock size={14} className="mr-1" />,
          text: 'Unknown',
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const statusConfig = getStatusConfig(realtimeData.status);

  return (
    <div className="flex items-center gap-3">
      <Badge className={`${statusConfig.className} border flex-shrink-0`}>
        {statusConfig.icon}
        {statusConfig.text}
      </Badge>
    </div>
  );
};

export default WebsiteSourceStatus;
