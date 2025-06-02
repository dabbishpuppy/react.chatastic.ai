
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
            progress: newData.progress,
            timestamp: new Date().toISOString()
          });
          
          setRealtimeData({
            status: newStatus,
            progress: newData.progress,
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
          text: isChild ? 'Completed' : `Completed (${realtimeData.linksCount} pages)`,
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

  const getProgressValue = () => {
    const progressValue = realtimeData.progress || 0;
    return Math.min(100, Math.max(0, progressValue));
  };

  const getProgressBarColor = () => {
    const status = realtimeData.status;
    switch (status) {
      case 'in_progress':
        return 'bg-blue-600';
      case 'completed':
        return 'bg-green-600';
      case 'failed':
        return 'bg-red-600';
      default:
        return 'bg-gray-300';
    }
  };

  const statusConfig = getStatusConfig(realtimeData.status);

  return (
    <div className="flex items-center gap-3">
      <Badge className={`${statusConfig.className} border flex-shrink-0`}>
        {statusConfig.icon}
        {statusConfig.text}
      </Badge>
      
      {/* Always show progress bar for parent sources */}
      {!isChild && (
        <div className="w-20 bg-gray-200 rounded-full h-2 flex-shrink-0">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
            style={{ width: `${getProgressValue()}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default WebsiteSourceStatus;
