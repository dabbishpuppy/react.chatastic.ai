
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, Clock, GraduationCap, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import WebsiteSourceStatusRobust from './WebsiteSourceStatusRobust';
import { SimplifiedSourceStatusService } from '@/services/SimplifiedSourceStatusService';

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

  // Compute status using SimplifiedSourceStatusService if we have the full source
  const computedStatus = source ? SimplifiedSourceStatusService.getSourceStatus(source) : status;

  // Enhanced status configuration with proper flow
  const getStatusConfig = (status?: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock size={14} className="mr-1" />,
          text: 'Pending',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          description: 'Queued for crawling'
        };
      case 'in_progress':
        return {
          icon: <Loader2 size={14} className="mr-1 animate-spin" />,
          text: 'Crawling',
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          description: 'Discovering and crawling pages'
        };
      case 'completed':
        return {
          icon: <CheckCircle size={14} className="mr-1" />,
          text: 'Completed',
          className: 'bg-green-100 text-green-800 border-green-200',
          description: 'All pages crawled'
        };
      case 'crawled':
        return {
          icon: <Brain size={14} className="mr-1" />,
          text: 'Ready for Training',
          className: 'bg-orange-100 text-orange-800 border-orange-200',
          description: 'Ready to process for AI training'
        };
      case 'training':
        return {
          icon: <Loader2 size={14} className="mr-1 animate-spin" />,
          text: 'Training',
          className: 'bg-purple-100 text-purple-800 border-purple-200',
          description: 'Processing content for AI'
        };
      case 'trained':
        return {
          icon: <GraduationCap size={14} className="mr-1" />,
          text: 'Trained',
          className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          description: 'Ready for use in agent'
        };
      case 'failed':
        return {
          icon: <AlertTriangle size={14} className="mr-1" />,
          text: 'Failed',
          className: 'bg-red-100 text-red-800 border-red-200',
          description: 'Process failed'
        };
      default:
        return {
          icon: <Clock size={14} className="mr-1" />,
          text: 'Pending',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          description: 'Queued for processing'
        };
    }
  };

  const statusConfig = getStatusConfig(computedStatus);

  return (
    <div className="flex items-center gap-3">
      <Badge className={`${statusConfig.className} border flex-shrink-0`} title={statusConfig.description}>
        {statusConfig.icon}
        {statusConfig.text}
      </Badge>
    </div>
  );
};

export default WebsiteSourceStatus;
