import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Calendar, Database, FileText, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ChildPageInfoProps {
  url: string;
  status: string;
  contentSize?: number;
  chunksCreated?: number;
  processingTimeMs?: number;
  errorMessage?: string;
  createdAt: string;
  parentSourceId?: string;
  pageId?: string; // Add page ID to listen for updates
}

const ChildPageInfo: React.FC<ChildPageInfoProps> = ({
  url,
  status,
  contentSize,
  chunksCreated,
  errorMessage,
  createdAt,
  parentSourceId,
  pageId
}) => {
  const [displayStatus, setDisplayStatus] = useState(status);
  const [parentTrainingState, setParentTrainingState] = useState<any>(null);
  const [childProcessingStatus, setChildProcessingStatus] = useState<string | null>(null);

  // Monitor both parent source training state AND child processing state
  useEffect(() => {
    if (!parentSourceId) {
      setDisplayStatus(status);
      return;
    }

    // Fetch initial parent state
    const fetchParentState = async () => {
      const { data } = await supabase
        .from('agent_sources')
        .select('crawl_status, metadata, requires_manual_training')
        .eq('id', parentSourceId)
        .single();
      
      if (data) {
        setParentTrainingState(data);
        updateDisplayStatus(status, childProcessingStatus, data);
      }
    };

    fetchParentState();

    // Subscribe to parent source changes
    const parentChannel = supabase
      .channel(`parent-training-${parentSourceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_sources',
          filter: `id=eq.${parentSourceId}`
        },
        (payload) => {
          const updatedParent = payload.new as any;
          console.log('Parent source update for child page:', updatedParent);
          setParentTrainingState(updatedParent);
          updateDisplayStatus(status, childProcessingStatus, updatedParent);
        }
      )
      .subscribe();

    // Listen for training completion events
    const handleTrainingCompleted = () => {
      console.log('Training completed event - updating child page status');
      fetchParentState();
    };

    window.addEventListener('trainingCompleted', handleTrainingCompleted);

    return () => {
      supabase.removeChannel(parentChannel);
      window.removeEventListener('trainingCompleted', handleTrainingCompleted);
    };
  }, [status, parentSourceId, childProcessingStatus]);

  // Monitor child page processing status changes
  useEffect(() => {
    if (!pageId) return;

    // Fetch initial child processing status
    const fetchChildStatus = async () => {
      const { data } = await supabase
        .from('source_pages')
        .select('processing_status')
        .eq('id', pageId)
        .single();
      
      if (data) {
        setChildProcessingStatus(data.processing_status);
        updateDisplayStatus(status, data.processing_status, parentTrainingState);
      }
    };

    fetchChildStatus();

    // Subscribe to child page processing status changes
    const childChannel = supabase
      .channel(`child-processing-${pageId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'source_pages',
          filter: `id=eq.${pageId}`
        },
        (payload) => {
          const updatedChild = payload.new as any;
          console.log('Child page processing update:', updatedChild);
          setChildProcessingStatus(updatedChild.processing_status);
          updateDisplayStatus(status, updatedChild.processing_status, parentTrainingState);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(childChannel);
    };
  }, [pageId, status, parentTrainingState]);

  const updateDisplayStatus = (childStatus: string, processingStatus: string | null, parentState: any) => {
    // Priority 1: If child is actively being processed (chunked), show "In Progress"
    if (processingStatus === 'processing') {
      setDisplayStatus('in_progress');
      return;
    }

    // Priority 2: If child processing is complete and parent training is done, show "Trained"
    if (processingStatus === 'processed' && parentState) {
      const metadata = (parentState.metadata as any) || {};
      
      if (metadata.training_completed_at || metadata.last_trained_at) {
        setDisplayStatus('trained');
        return;
      }
    }

    // Priority 3: If parent is currently training and child is completed, show "In Progress"
    if (parentState) {
      const metadata = (parentState.metadata as any) || {};
      
      if (parentState.crawl_status === 'training' || metadata.training_status === 'in_progress') {
        if (childStatus === 'completed') {
          setDisplayStatus('in_progress');
          return;
        }
      }
    }
    
    // Default to original status
    setDisplayStatus(childStatus);
  };

  const getFullUrl = (url: string) => {
    return url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`;
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

  const formatTimeAgo = (dateString: string): string => {
    const timeAgo = formatDistanceToNow(new Date(dateString), { addSuffix: true });
    
    return timeAgo
      .replace(/^about\s+0\s+\w+\s+ago$/, 'just now')
      .replace(/^0\s+\w+\s+ago$/, 'just now')
      .replace(/^about\s+/, '')
      .replace(/^less than a minute ago$/, 'just now');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-white';
      case 'trained': return 'bg-purple-500 text-white';
      case 'in_progress': return 'bg-blue-500 text-white';
      case 'pending': return 'bg-yellow-500 text-white';
      case 'failed': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'trained': return 'Trained';
      case 'in_progress': return 'In Progress';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  const isLoading = displayStatus === 'in_progress' || displayStatus === 'pending';
  const fullUrl = getFullUrl(url);

  console.log('ChildPageInfo - displayStatus:', displayStatus, 'originalStatus:', status, 'processingStatus:', childProcessingStatus, 'parentState:', parentTrainingState);

  return (
    <>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 truncate" title={fullUrl}>
            {fullUrl}
          </p>
          <ExternalLink 
            className="w-3 h-3 text-gray-400 cursor-pointer hover:text-gray-600 flex-shrink-0" 
            onClick={() => window.open(fullUrl, '_blank')}
          />
        </div>
        <div className="flex items-center text-xs text-gray-500 mt-1">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Crawled {formatTimeAgo(createdAt)}</span>
          </div>
          
          {(displayStatus === 'completed' || displayStatus === 'trained') && contentSize && (
            <>
              <span className="mx-2">•</span>
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>{formatBytes(contentSize)}</span>
              </div>
            </>
          )}
          
          {chunksCreated && (
            <>
              <span className="mx-2">•</span>
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>{chunksCreated} chunks</span>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Badge className={`${getStatusColor(displayStatus)} text-xs px-2 py-0 flex items-center gap-1`}>
          {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
          {getStatusText(displayStatus)}
        </Badge>
      </div>

      {errorMessage && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
          Error: {errorMessage}
        </div>
      )}
    </>
  );
};

export default ChildPageInfo;
