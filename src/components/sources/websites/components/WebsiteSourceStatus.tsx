
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, Clock, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import WebsiteSourceStatusRobust from './WebsiteSourceStatusRobust';

interface WebsiteSourceStatusProps {
  sourceId?: string;
  status?: string;
  progress?: number;
  linksCount?: number;
  metadata?: any;
  showProgressBar?: boolean;
  isChild?: boolean;
}

const WebsiteSourceStatus: React.FC<WebsiteSourceStatusProps> = ({
  sourceId,
  status,
  linksCount = 0,
  metadata,
  isChild = false
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

  // Fallback to simple status display for legacy usage
  const getStatusConfig = (status?: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock size={14} className="mr-1" />,
          text: 'Pending',
          className: 'bg-gray-100 text-gray-800 border-gray-200'
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
          text: 'Unknown',
          className: 'bg-gray-100 text-gray-800 border-gray-200'
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
    </div>
  );
};

export default WebsiteSourceStatus;
