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
  pageId?: string; // Add pageId to track individual page updates
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
  const [childProcessingStatus, setChildProcessingStatus] = useState<string>('pending');

  // Monitor both parent training state AND child processing status
  useEffect(() => {
    if (!parentSourceId || !pageId) {
      setDisplayStatus(status);
      return;
    }

    // Fetch initial states
    const fetchInitialStates = async () => {
      // Get parent state
      const { data: parentData } = await supabase
        .from('agent_sources')
        .select('crawl_status, metadata, requires_manual_training')
        .eq('id', parentSourceId)
        .single();
      
      // Get child processing status
      const { data: childData } = await supabase
        .from('source_pages')
        .select('processing_status, status')
        .eq('id', pageId)
        .single();
      
      if (parentData) {
        setParentTrainingState(parentData);
      }
      
      if (childData) {
        setChildProcessingStatus(childData.processing_status || 'pending');
      }
      
      updateDisplayStatus(status, parentData, childData?.processing_status || 'pending');
    };

    fetchInitialStates();

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
          updateDisplayStatus(status, updatedParent, childProcessingStatus);
        }
      )
      .subscribe();

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
          const newProcessingStatus = updatedChild.processing_status || 'pending';
          setChildProcessingStatus(newProcessingStatus);
          updateDisplayStatus(updatedChild.status, parentTrainingState, newProcessingStatus);
        }
      )
      .subscribe();

    // Listen for training completion events
    const handleTrainingCompleted = () => {
      console.log('Training completed event - updating child page status');
      fetchInitialStates();
    };

    window.addEventListener('trainingCompleted', handleTrainingCompleted);

    return () => {
      supabase.removeChannel(parentChannel);
      supabase.removeChannel(childChannel);
      window.removeEventListener('trainingCompleted', handleTrainingCompleted);
    };
  }, [status, parentSourceId, pageId, childProcessingStatus]);

  const updateDisplayStatus = (childStatus: string, parentState: any, processingStatus: string) => {
    console.log('Updating child display status:', {
      childStatus,
      processingStatus,
      parentState: parentState?.metadata
    });

    // If child is actively being processed (chunking), show "In Progress"
    if (processingStatus === 'processing') {
      setDisplayStatus('in_progress');
      return;
    }

    // If child is completed and parent has training metadata
    if (childStatus === 'completed' && parentState) {
      const metadata = (parentState.metadata as any) || {};
      
      // If parent training is completed, show "Trained"
      if (metadata.training_completed_at || metadata.last_trained_at) {
        setDisplayStatus('trained');
        return;
      }
      
      // If parent is currently training, show "In Progress"
      if (parentState.crawl_status === 'training' || metadata.training_status === 'in_progress') {
        setDisplayStatus('in_progress');
        return;
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

  console.log('ChildPageInfo - displayStatus:', displayStatus, 'originalStatus:', status, 'processingStatus:', childProcessingStatus);

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
