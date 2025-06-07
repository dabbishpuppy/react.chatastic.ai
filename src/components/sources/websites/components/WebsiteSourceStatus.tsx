
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, Clock, GraduationCap, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import WebsiteSourceStatusRobust from './WebsiteSourceStatusRobust';
import { SimplifiedSourceStatusService } from '@/services/SimplifiedSourceStatusService';
import { WorkflowIntegrationService } from '@/services/workflow/WorkflowIntegrationService';
import WorkflowStatusBadge from './WorkflowStatusBadge';

interface WebsiteSourceStatusProps {
  sourceId?: string;
  status?: string;
  progress?: number;
  linksCount?: number;
  metadata?: any;
  showProgressBar?: boolean;
  isChild?: boolean;
  source?: any; // Full source object for status computation
}

const WebsiteSourceStatus: React.FC<WebsiteSourceStatusProps> = ({
  sourceId,
  status,
  linksCount = 0,
  metadata,
  isChild = false,
  source
}) => {
  // Use the robust version if we have a sourceId
  if (sourceId) {
    return (
      <WebsiteSourceStatusRobust 
        sourceId={sourceId}
        initialStatus={status}
        showConnectionStatus={!isChild}
      />
    );
  }

  // Compute status using workflow integration service if we have the full source
  let computedStatus = status;
  if (source) {
    // Check if this source should use the workflow system
    if (WorkflowIntegrationService.shouldUseWorkflow(source)) {
      computedStatus = WorkflowIntegrationService.getDisplayStatus(source);
    } else {
      computedStatus = SimplifiedSourceStatusService.getSourceStatus(source);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <WorkflowStatusBadge
        status={computedStatus || 'pending'}
        workflowStatus={source?.workflow_status}
      />
    </div>
  );
};

export default WebsiteSourceStatus;
