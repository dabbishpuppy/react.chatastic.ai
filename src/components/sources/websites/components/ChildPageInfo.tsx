
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Calendar, Database, FileText, Loader2, ExternalLink } from 'lucide-react';

interface ChildPageInfoProps {
  url: string;
  status: string;
  contentSize?: number;
  chunksCreated?: number;
  processingTimeMs?: number;
  errorMessage?: string;
  createdAt: string;
  processingStatus?: string; // Add processing status for training flow
  parentSource?: any; // Parent source to check training state
}

const ChildPageInfo: React.FC<ChildPageInfoProps> = ({
  url,
  status,
  contentSize,
  chunksCreated,
  errorMessage,
  createdAt,
  processingStatus,
  parentSource
}) => {
  const getFullUrl = (url: string) => {
    // If URL doesn't have protocol, add https://
    return url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`;
  };

  const formatUrl = (url: string) => {
    try {
      const fullUrl = getFullUrl(url);
      const urlObj = new URL(fullUrl);
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return url;
    }
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
    
    // Handle various time formats that might include "0"
    return timeAgo
      .replace(/^about\s+0\s+\w+\s+ago$/, 'just now')
      .replace(/^0\s+\w+\s+ago$/, 'just now')
      .replace(/^about\s+/, '')
      .replace(/^less than a minute ago$/, 'just now');
  };

  const getStatusColor = (mappedStatus: string) => {
    switch (mappedStatus) {
      case 'Trained': return 'bg-green-500 text-white';
      case 'In Progress': return 'bg-blue-500 text-white';
      case 'Pending': return 'bg-yellow-500 text-white';
      case 'Failed': return 'bg-red-500 text-white';
      case 'Completed': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: string, processingStatus?: string, parentSource?: any) => {
    // Check if parent is in training or completed training
    const parentMetadata = (parentSource?.metadata as any) || {};
    const isParentTraining = parentMetadata.training_status === 'in_progress' || parentSource?.crawl_status === 'training';
    const isParentTrainingCompleted = parentMetadata.training_completed_at || parentMetadata.children_training_completed;

    // During training flow, map processing status
    if (processingStatus) {
      switch (processingStatus) {
        case 'in_progress': return 'In Progress';
        case 'completed': 
          // If parent training is completed, show as "Trained"
          return isParentTrainingCompleted ? 'Trained' : 'Completed';
        case 'failed': return 'Failed';
        default: return 'Pending';
      }
    }

    // Fallback to original status mapping
    switch (status) {
      case 'completed': 
        // If parent is training completed, show as "Trained"
        return isParentTrainingCompleted ? 'Trained' : 'Completed';
      case 'in_progress': return isParentTraining ? 'In Progress' : 'In Progress';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  const mappedStatus = getStatusText(status, processingStatus, parentSource);
  const isLoading = mappedStatus === 'In Progress' || mappedStatus === 'Pending';
  const fullUrl = getFullUrl(url);

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
          
          {(status === 'completed' || mappedStatus === 'Trained') && contentSize && (
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
        <Badge className={`${getStatusColor(mappedStatus)} text-xs px-2 py-0 flex items-center gap-1`}>
          {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
          {mappedStatus}
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
