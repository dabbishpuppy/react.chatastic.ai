
import React, { useEffect, useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, Clock, Wifi, WifiOff, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SourcePagesStats } from '@/services/rag/enhanced/crawlTypes';

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
        setError(null);
        const { data: source, error } = await supabase
          .from('agent_sources')
          .select('crawl_status, progress, links_count, metadata, total_jobs, completed_jobs')
          .eq('id', sourceId)
          .single();

        if (error) {
          console.error('Error fetching source data:', error);
          setError(`Unable to fetch source data: ${error.message}`);
          return;
        }

        if (source) {
          // Check if this source has been trained by looking at metadata
          const metadata = source.metadata as Record<string, any> || {};
          const hasTrainingCompleted = metadata.training_completed || metadata.last_trained_at;
          
          if (hasTrainingCompleted && source.crawl_status === 'completed') {
            setStatus('trained');
          } else {
            setStatus(source.crawl_status || 'pending');
          }
          
          setProgress(source.progress || 0);
          setLinksCount(source.links_count || 0);
          
          // Count child pages to verify the links_count
          const { count: actualChildCount, error: countError } = await supabase
            .from('source_pages')
            .select('*', { count: 'exact', head: true })
            .eq('parent_source_id', sourceId);
            
          if (!countError && actualChildCount !== null) {
            // Update links count if it differs from the database
            if (actualChildCount > 0 && source.links_count !== actualChildCount) {
              setLinksCount(actualChildCount);
              // Also update the agent_source record if needed
              if (source.total_jobs === 0 || source.completed_jobs === 0) {
                await supabase
                  .from('agent_sources')
                  .update({ 
                    links_count: actualChildCount,
                    total_jobs: actualChildCount 
                  })
                  .eq('id', sourceId);
              }
            }
          }
          setLastUpdateTime(new Date());
        }
      } catch (error: any) {
        console.error('Error in fetchInitialData:', error);
        setError(`Data fetch error: ${error.message}`);
      }
    };

    fetchInitialData();

    // Subscribe to agent_sources table changes
    const agentSourceChannel = supabase
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
          const metadata = updatedSource.metadata as Record<string, any> || {};
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
          setError(null);
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setIsConnected(false);
          setError('Real-time connection lost');
        }
      });

    // Also subscribe to source_pages changes for this parent source
    const sourcePagesChannel = supabase
      .channel(`source-pages-parent-${sourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'source_pages',
          filter: `parent_source_id=eq.${sourceId}`
        },
        async () => {
          // On any source_pages change, fetch current counts and update status
          try {
            // Count total and completed pages
            const { data: statsData, error: countError } = await supabase
              .rpc<SourcePagesStats>('get_source_pages_stats', { 
                parent_source_id_param: sourceId
              });

            if (countError) {
              console.error('Error fetching source pages stats:', countError);
              return;
            }

            const pageCounts = statsData as SourcePagesStats;
            
            if (pageCounts) {
              // If we have data from source_pages, update our local state
              const totalPages = pageCounts.total_count || 0;
              const completedPages = pageCounts.completed_count || 0;
              const failedPages = pageCounts.failed_count || 0;
              
              // Calculate progress
              let newProgress = 0;
              if (totalPages > 0) {
                newProgress = Math.round(((completedPages + failedPages) / totalPages) * 100);
              }
              
              // Determine status
              let newStatus = 'pending';
              if (totalPages === 0) {
                newStatus = 'pending';
              } else if (completedPages + failedPages === totalPages) {
                newStatus = 'completed';
              } else if (completedPages > 0 || failedPages > 0) {
                newStatus = 'in_progress';
              }
              
              // Update local state
              setLinksCount(totalPages);
              setProgress(newProgress);
              
              // Only update status if our new status is more "advanced" than current
              const statusOrder = { 'pending': 0, 'in_progress': 1, 'completed': 2, 'crawled': 3, 'training': 4, 'trained': 5 };
              if (statusOrder[newStatus as keyof typeof statusOrder] > statusOrder[status as keyof typeof statusOrder]) {
                setStatus(newStatus);
              }
              
              setLastUpdateTime(new Date());
              
              // Also update the parent source record in the database to keep it in sync
              await supabase
                .from('agent_sources')
                .update({
                  links_count: totalPages,
                  progress: newProgress,
                  crawl_status: newStatus,
                  updated_at: new Date().toISOString()
                })
                .eq('id', sourceId);
            }
          } catch (error: any) {
            console.error('Error handling source_pages update:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log(`Source pages subscription status for ${sourceId}: ${status}`);
      });

    return () => {
      supabase.removeChannel(agentSourceChannel);
      supabase.removeChannel(sourcePagesChannel);
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
          text: 'Pending', // Default to Pending instead of Unknown
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
    </div>
  );
};

export default WebsiteSourceStatusRobust;
