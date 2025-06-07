
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SimpleStatusService } from '@/services/SimpleStatusService';
import { getSimpleStatusConfig } from '../services/simpleStatusConfig';

interface WebsiteSourceStatusBadgesProps {
  crawlStatus: string;
  isExcluded: boolean;
  linksCount: number;
  progress?: number;
  sourceId?: string;
  source?: any;
}

const WebsiteSourceStatusBadges: React.FC<WebsiteSourceStatusBadgesProps> = ({
  crawlStatus: initialCrawlStatus,
  isExcluded,
  sourceId,
  source
}) => {
  const [sourceData, setSourceData] = useState(source);

  useEffect(() => {
    if (!sourceId) return;

    setSourceData(source);

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
          console.log('Real-time source update received:', updatedSource);
          setSourceData(updatedSource);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sourceId, source]);

  const computedStatus = sourceData ? SimpleStatusService.getSourceStatus(sourceData) : initialCrawlStatus;
  const statusConfig = getSimpleStatusConfig(computedStatus);

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
