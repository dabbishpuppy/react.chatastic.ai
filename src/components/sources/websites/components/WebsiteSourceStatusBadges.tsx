
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { EyeOff, CheckCircle, Loader2, Clock, AlertTriangle, GraduationCap, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SimplifiedSourceStatusService } from '@/services/SimplifiedSourceStatusService';

interface WebsiteSourceStatusBadgesProps {
  crawlStatus: string;
  isExcluded: boolean;
  linksCount: number;
  progress?: number;
  sourceId?: string;
  source?: any; // Full source object for proper status determination
}

const WebsiteSourceStatusBadges: React.FC<WebsiteSourceStatusBadgesProps> = ({
  crawlStatus: initialCrawlStatus,
  isExcluded,
  sourceId,
  source: initialSource
}) => {
  const [source, setSource] = useState(initialSource || { crawl_status: initialCrawlStatus });

  // Set up real-time subscription for status updates
  useEffect(() => {
    if (!sourceId) return;

    setSource(initialSource || { crawl_status: initialCrawlStatus });

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
          console.log('📡 Real-time source update received:', updatedSource);
          setSource(updatedSource);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sourceId, initialCrawlStatus, initialSource]);

  const getStatusConfig = (computedStatus: string) => {
    switch (computedStatus) {
      case 'pending':
        return {
          icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" />,
          text: 'Pending',
          className: 'bg-yellow-500 text-white'
        };
      case 'crawling':
      case 'in_progress':
        return {
          icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" />,
          text: 'Crawling',
          className: 'bg-blue-500 text-white'
        };
      case 'crawled':
      case 'ready_for_training':
        return {
          icon: <Clock className="w-3 h-3 mr-1" />,
          text: 'Ready for Training',
          className: 'bg-orange-500 text-white'
        };
      case 'training':
        return {
          icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" />,
          text: 'Training',
          className: 'bg-blue-600 text-white'
        };
      case 'trained':
        return {
          icon: <GraduationCap className="w-3 h-3 mr-1" />,
          text: 'Trained',
          className: 'bg-purple-600 text-white'
        };
      case 'training_completed':
        return {
          icon: <CheckCircle className="w-3 h-3 mr-1" />,
          text: 'Training Completed',
          className: 'bg-green-600 text-white'
        };
      case 'completed':
        return {
          icon: <Clock className="w-3 h-3 mr-1" />,
          text: 'Ready for Training',
          className: 'bg-orange-500 text-white'
        };
      case 'failed':
        return {
          icon: <AlertTriangle className="w-3 h-3 mr-1" />,
          text: 'Failed',
          className: 'bg-red-500 text-white'
        };
      default:
        return {
          icon: <Clock className="w-3 h-3 mr-1" />,
          text: 'Ready for Training',
          className: 'bg-orange-500 text-white'
        };
    }
  };

  // Use SimplifiedSourceStatusService to get the correct status
  const computedStatus = source ? SimplifiedSourceStatusService.getSourceStatus(source) : 'pending';
  const statusConfig = getStatusConfig(computedStatus);

  console.log('🔍 WebsiteSourceStatusBadges rendering:', {
    sourceId,
    computedStatus,
    source: source ? {
      crawl_status: source.crawl_status,
      requires_manual_training: source.requires_manual_training,
      metadata: source.metadata
    } : null
  });

  return (
    <div className="flex items-center gap-2">
      <Badge className={`${statusConfig.className} flex items-center`}>
        {statusConfig.icon}
        {statusConfig.text}
      </Badge>
      
      {isExcluded && (
        <Badge variant="secondary">
          <EyeOff className="w-3 h-3 mr-1" />
          Excluded
        </Badge>
      )}
    </div>
  );
};

export default WebsiteSourceStatusBadges;
