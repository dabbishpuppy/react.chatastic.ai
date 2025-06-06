
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { EyeOff, CheckCircle, Loader2, Clock, AlertTriangle, GraduationCap, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WebsiteSourceStatusBadgesProps {
  crawlStatus: string;
  isExcluded: boolean;
  linksCount: number;
  progress?: number;
  sourceId?: string;
}

const WebsiteSourceStatusBadges: React.FC<WebsiteSourceStatusBadgesProps> = ({
  crawlStatus: initialCrawlStatus,
  isExcluded,
  sourceId
}) => {
  const [crawlStatus, setCrawlStatus] = useState(initialCrawlStatus);

  // Set up real-time subscription for status updates
  useEffect(() => {
    if (!sourceId) return;

    setCrawlStatus(initialCrawlStatus);

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
          if (updatedSource.crawl_status) {
            setCrawlStatus(updatedSource.crawl_status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sourceId, initialCrawlStatus]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" />,
          text: 'Pending',
          className: 'bg-yellow-500 text-white'
        };
      case 'in_progress':
        return {
          icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" />,
          text: 'Crawling',
          className: 'bg-blue-500 text-white'
        };
      case 'completed':
        return {
          icon: <Clock className="w-3 h-3 mr-1" />,
          text: 'Ready for Training',
          className: 'bg-orange-500 text-white'
        };
      case 'crawled':
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

  const statusConfig = getStatusConfig(crawlStatus);

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
