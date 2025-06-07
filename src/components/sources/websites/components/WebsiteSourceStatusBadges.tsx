
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SimplifiedSourceStatusService } from '@/services/SimplifiedSourceStatusService';
import { getStatusConfig } from '../services/statusConfigService';

interface WebsiteSourceStatusBadgesProps {
  crawlStatus: string;
  isExcluded: boolean;
  linksCount: number;
  progress?: number;
  sourceId?: string;
  source?: any; // Full source object for proper status computation
}

const WebsiteSourceStatusBadges: React.FC<WebsiteSourceStatusBadgesProps> = ({
  crawlStatus: initialCrawlStatus,
  isExcluded,
  sourceId,
  source
}) => {
  const [crawlStatus, setCrawlStatus] = useState(initialCrawlStatus);
  const [sourceData, setSourceData] = useState(source);

  // Set up real-time subscription for status updates including metadata changes
  useEffect(() => {
    if (!sourceId) return;

    setCrawlStatus(initialCrawlStatus);
    setSourceData(source);

    console.log(`📡 Setting up real-time status tracking for source: ${sourceId}`);

    const channel = supabase
      .channel(`source-status-badges-${sourceId}`)
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
          console.log('📡 Real-time source update received in badges:', updatedSource);
          
          // Update both crawl status and full source data for proper status computation
          setCrawlStatus(updatedSource.crawl_status);
          setSourceData(updatedSource);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Status badges subscription status for ${sourceId}:`, status);
      });

    // Listen for training completion events
    const handleTrainingCompleted = () => {
      console.log('🎓 Training completed event - updating source status in badges');
      // Trigger a refetch of source data
      if (sourceId) {
        supabase
          .from('agent_sources')
          .select('*')
          .eq('id', sourceId)
          .single()
          .then(({ data }) => {
            if (data) {
              console.log('🔄 Refetched source data in badges:', data);
              setSourceData(data);
              setCrawlStatus(data.crawl_status);
            }
          });
      }
    };

    window.addEventListener('trainingCompleted', handleTrainingCompleted);

    return () => {
      console.log(`🔌 Cleaning up status badges subscription for: ${sourceId}`);
      supabase.removeChannel(channel);
      window.removeEventListener('trainingCompleted', handleTrainingCompleted);
    };
  }, [sourceId, initialCrawlStatus, source]);

  // Use SimplifiedSourceStatusService to determine the correct status
  const computedStatus = sourceData ? SimplifiedSourceStatusService.getSourceStatus(sourceData) : crawlStatus;
  const statusConfig = getStatusConfig(computedStatus);

  console.log('📊 WebsiteSourceStatusBadges - computed status:', computedStatus, 'for source:', sourceId, 'raw status:', crawlStatus);

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
