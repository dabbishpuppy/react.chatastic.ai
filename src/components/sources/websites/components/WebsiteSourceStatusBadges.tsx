
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SimplifiedSourceStatusService, SourceStatus } from '@/services/SimplifiedSourceStatusService';
import { getStatusConfig } from '../services/statusConfigService';

interface WebsiteSourceStatusBadgesProps {
  crawlStatus: string;
  isExcluded: boolean;
  linksCount: number;
  progress?: number;
  sourceId?: string;
  sourceData?: any; // Full source object with metadata
  isChildSource?: boolean;
  processingStatus?: string; // For child sources
}

const WebsiteSourceStatusBadges: React.FC<WebsiteSourceStatusBadgesProps> = ({
  crawlStatus: initialCrawlStatus,
  isExcluded,
  sourceId,
  sourceData,
  isChildSource = false,
  processingStatus
}) => {
  const [currentStatus, setCurrentStatus] = useState<SourceStatus>('pending');

  // Determine status using the service
  useEffect(() => {
    if (sourceData) {
      const status = SimplifiedSourceStatusService.getSourceStatus(sourceData);
      setCurrentStatus(status);
    } else if (isChildSource && processingStatus) {
      // For child sources, map processing_status to display status
      switch (processingStatus) {
        case 'in_progress':
          setCurrentStatus('training');
          break;
        case 'completed':
          setCurrentStatus('trained');
          break;
        case 'failed':
          setCurrentStatus('failed');
          break;
        default:
          setCurrentStatus('pending');
      }
    } else {
      setCurrentStatus(initialCrawlStatus as SourceStatus);
    }
  }, [sourceData, isChildSource, processingStatus, initialCrawlStatus]);

  // Set up real-time subscription for status updates
  useEffect(() => {
    if (!sourceId) return;

    const channel = supabase
      .channel(`source-status-${sourceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: isChildSource ? 'source_pages' : 'agent_sources',
          filter: `id=eq.${sourceId}`
        },
        (payload) => {
          const updatedSource = payload.new as any;
          
          if (isChildSource) {
            // For child sources, use processing_status
            const status = updatedSource.processing_status;
            switch (status) {
              case 'in_progress':
                setCurrentStatus('training');
                break;
              case 'completed':
                setCurrentStatus('trained');
                break;
              case 'failed':
                setCurrentStatus('failed');
                break;
              default:
                setCurrentStatus('pending');
            }
          } else {
            // For parent sources, use the service
            const status = SimplifiedSourceStatusService.getSourceStatus(updatedSource);
            setCurrentStatus(status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sourceId, isChildSource]);

  const statusConfig = getStatusConfig(currentStatus);

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
