
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
  
  const statusRef = useRef(status);
  const progressRef = useRef(progress);
  const linksCountRef = useRef(linksCount);

  // Update refs when state changes
  useEffect(() => {
    statusRef.current = status;
    progressRef.current = progress;
    linksCountRef.current = linksCount;
  }, [status, progress, linksCount]);

  // Listen for training completion events to update status to "trained"
  useEffect(() => {
    const handleTrainingCompleted = (event: CustomEvent) => {
      console.log('🎓 Training completed event received, updating source status to trained');
      setStatus('trained');
      setLastUpdateTime(new Date());
    };

    window.addEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
    
    return () => {
      window.removeEventListener('trainingCompleted', handleTrainingCompleted as EventListener);
    };
  }, []);

  // Real-time subscription for source updates
  useEffect(() => {
    if (!sourceId) return;

    const fetchInitialData = async () => {
      try {
        const { data: source, error } = await supabase
          .from('agent_sources')
          .select('crawl_status, progress, links_count, metadata')
          .eq('id', sourceId)
          .single();

        if (error) {
          console.error('Error fetching source data:', error);
          return;
        }

        if (source) {
          // Check if this source has been trained by looking at metadata
          const metadata = source.metadata || {};
          const hasTrainingCompleted = metadata.training_completed || metadata.last_trained_at;
          
          if (hasTrainingCompleted && source.crawl_status === 'completed') {
            setStatus('trained');
          } else {
            setStatus(source.crawl_status || 'pending');
          }
          
          setProgress(source.progress || 0);
          setLinksCount(source.links_count || 0);
          setLastUpdateTime(new Date());
        }
      } catch (error) {
        console.error('Error in fetchInitialData:', error);
      }
    };

    fetchInitialData();

    const channel = supabase
      .channel(`source-status-${sourceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_sources',
          filter: `id=eq.${sourceId}`
        },
        (payload) => {
          const updatedSource = payload.new as any;
          
          // Check if training has completed for this source
          const metadata = updatedSource.metadata || {};
          const hasTrainingCompleted = metadata.training_completed || metadata.last_trained_at;
          
          if (hasTrainingCompleted && updatedSource.crawl_status === 'completed') {
            setStatus('trained');
          } else {
            setStatus(updatedSource.crawl_status || 'pending');
          }
          
          setProgress(updatedSource.progress || 0);
          setLinksCount(updatedSource.links_count || 0);
          setLastUpdateTime(new Date());
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sourceId]);

  const getStatusConfig = (currentStatus: string) => {
    switch (currentStatus) {
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
          text: 'Unknown',
          className: 'bg-gray-100 text-gray-800 border-gray-200'
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
            <Wifi size={12} className="text-green-500" />
          ) : (
            <WifiOff size={12} className="text-red-500" />
          )}
        </div>
      )}
    </div>
  );
};

export default WebsiteSourceStatusRobust;
