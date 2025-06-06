
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Clock, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface SourcePageItemProps {
  page: {
    id: string;
    url: string;
    status: string;
    created_at: string;
    completed_at?: string;
    error_message?: string;
    content_size?: number;
    chunks_created?: number;
    processing_time_ms?: number;
  };
}

const SourcePageItem: React.FC<SourcePageItemProps> = ({ page }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock size={12} />,
          text: 'Pending',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
      case 'in_progress':
        return {
          icon: <Loader2 size={12} className="animate-spin" />,
          text: 'Processing',
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'completed':
        return {
          icon: <CheckCircle size={12} />,
          text: 'Completed',
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'failed':
        return {
          icon: <AlertTriangle size={12} />,
          text: 'Failed',
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      default:
        return {
          icon: <Clock size={12} />,
          text: 'Unknown',
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const statusConfig = getStatusConfig(page.status);
  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <a 
            href={page.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate flex items-center gap-1"
            title={page.url}
          >
            <ExternalLink size={12} />
            {new URL(page.url).pathname || '/'}
          </a>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {page.content_size && (
            <span>{formatBytes(page.content_size)}</span>
          )}
          {page.chunks_created && (
            <span>{page.chunks_created} chunks</span>
          )}
          {page.processing_time_ms && (
            <span>{formatDuration(page.processing_time_ms)}</span>
          )}
        </div>
        
        {page.error_message && (
          <div className="mt-1 text-xs text-red-600 truncate" title={page.error_message}>
            {page.error_message}
          </div>
        )}
      </div>
      
      <div className="flex-shrink-0">
        <Badge className={`${statusConfig.className} border flex items-center gap-1 text-xs`}>
          {statusConfig.icon}
          {statusConfig.text}
        </Badge>
      </div>
    </div>
  );
};

export default SourcePageItem;
