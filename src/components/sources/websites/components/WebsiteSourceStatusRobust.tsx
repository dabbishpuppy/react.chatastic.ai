
import React, { useEffect, useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, Clock, Wifi, WifiOff, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WebsiteSourceStatusRobustProps {
  sourceId: string;
  initialStatus?: string;
  showConnectionStatus?: boolean;
}

const WebsiteSourceStatusRobust: React.FC<WebsiteSourceStatusRobustProps> = ({
  sourceId,
  initialStatus,
  showConnectionStatus = true
}) => {
  const [status, setStatus] = useState(initialStatus || 'pending');
  const [progress, setProgress] = useState(0);
  const [linksCount, setLinksCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data and set up real-time subscription
  useEffect(() => {
    if (!sourceId) return;

    const fetchInitialData = async () => {
      try {
        setError(null);
        console.log(`📊 Fetching initial status for source: ${sourceId}`);
        
        const { data: source, error } = await supabase
          .from('agent_sources')
          .select('crawl_status, progress, links_count, total_jobs, completed_jobs')
          .eq('id', sourceId)
          .single();

        if (error) {
          console.error('Error fetching source data:', error);
          setError(`Unable to fetch source data: ${error.message}`);
          return;
        }

        if (source) {
          console.log(`📊 Initial source data:`, source);
          setStatus(source.crawl_status || 'pending');
          setProgress(source.progress || 0);
          setLinksCount(source.links_count || source.total_jobs || 0);
          setLastUpdateTime(new Date());
        }
      } catch (error: any) {
        console.error('Error in fetchInitialData:', error);
        setError(`Data fetch error: ${error.message}`);
      }
    };

    fetchInitialData();

    // Set up real-time subscription for agent_sources changes
    console.log(`📡 Setting up real-time subscription for source: ${sourceId}`);
    
    const agentSourceChannel = supabase
      .channel(`source-status-realtime-${sourceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_sources',
          filter: `id=eq.${sourceId}`
        },
        (payload) => {
          console.log(`📡 Real-time update for source ${sourceId}:`, payload);
          const updatedSource = payload.new as any;
          
          setStatus(updatedSource.crawl_status || 'pending');
          setProgress(updatedSource.progress || 0);
          setLinksCount(updatedSource.links_count || updatedSource.total_jobs || 0);
          setLastUpdateTime(new Date());
          setError(null);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'source_pages',
          filter: `parent_source_id=eq.${sourceId}`
        },
        async (payload) => {
          console.log(`📄 Source page update for parent ${sourceId}:`, payload);
          
          // When a source page updates, refresh the parent source data
          try {
            const { data: source, error } = await supabase
              .from('agent_sources')
              .select('crawl_status, progress, links_count, total_jobs, completed_jobs')
              .eq('id', sourceId)
              .single();

            if (!error && source) {
              setStatus(source.crawl_status || 'pending');
              setProgress(source.progress || 0);
              setLinksCount(source.links_count || source.total_jobs || 0);
              setLastUpdateTime(new Date());
            }
          } catch (error) {
            console.error('Error refreshing source after page update:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Subscription status for ${sourceId}: ${status}`);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setIsConnected(false);
          setError('Real-time connection lost');
        }
      });

    return () => {
      console.log(`📡 Cleaning up subscription for source: ${sourceId}`);
      supabase.removeChannel(agentSourceChannel);
    };
  }, [sourceId]);

  const getStatusConfig = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return {
          icon: <Clock size={14} className="mr-1" />,
          text: 'Pending',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
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
      case 'crawled':
        return {
          icon: <Clock size={14} className="mr-1" />,
          text: 'Ready for Training',
          className: 'bg-orange-100 text-orange-800 border-orange-200'
        };
      case 'training':
        return {
          icon: <Loader2 size={14} className="mr-1 animate-spin" />,
          text: 'Training',
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'trained':
        return {
          icon: <GraduationCap size={14} className="mr-1" />,
          text: 'Trained',
          className: 'bg-purple-100 text-purple-800 border-purple-200'
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
          text: 'Pending',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
    }
  };

  const statusConfig = getStatusConfig(status);

  return (
    <div className="flex items-center gap-3">
      <Badge className={`${statusConfig.className} border flex-shrink-0`}>
        {statusConfig.icon}
        {statusConfig.text}
      </Badge>
      
      {status === 'in_progress' && (
        <div className="text-xs text-gray-500">
          {progress > 0 && `${progress}% • `}
          {linksCount > 0 && `${linksCount} links`}
        </div>
      )}
      
      {showConnectionStatus && (
        <div className="flex items-center">
          {isConnected ? (
            <Wifi size={12} className="text-green-500" aria-label="Connected to real-time updates" />
          ) : (
            <WifiOff size={12} className="text-red-500" aria-label="Disconnected from real-time updates" />
          )}
        </div>
      )}
      
      {error && (
        <div className="text-xs text-red-500" title={error}>
          Error
        </div>
      )}
      
      <div className="text-xs text-gray-400">
        {lastUpdateTime.toLocaleTimeString()}
      </div>
    </div>
  );
};

export default WebsiteSourceStatusRobust;
