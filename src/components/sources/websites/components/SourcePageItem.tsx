
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ExternalLink, Clock, CheckCircle, AlertTriangle, Loader2, MoreHorizontal, Trash2, RefreshCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
  onDelete?: (pageId: string) => void;
  onRecrawl?: (pageId: string) => void;
}

const SourcePageItem: React.FC<SourcePageItemProps> = ({ 
  page, 
  onDelete,
  onRecrawl 
}) => {
  const [isActionLoading, setIsActionLoading] = useState(false);

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

  const getTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsActionLoading(true);
    try {
      await onDelete(page.id);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRecrawl = async () => {
    if (!onRecrawl) return;
    setIsActionLoading(true);
    try {
      await onRecrawl(page.id);
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <a 
            href={page.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate flex items-center gap-1 max-w-md"
            title={page.url}
          >
            <ExternalLink size={12} />
            {page.url}
          </a>
        </div>
        
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
          <Clock size={10} />
          <span>Added {getTimeAgo(page.created_at)}</span>
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
      
      <div className="flex items-center gap-2">
        <Badge className={`${statusConfig.className} border flex items-center gap-1 text-xs`}>
          {statusConfig.icon}
          {statusConfig.text}
        </Badge>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              disabled={isActionLoading}
            >
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={handleRecrawl} disabled={isActionLoading}>
              <RefreshCcw size={14} className="mr-2" />
              Recrawl Page
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleDelete} 
              disabled={isActionLoading}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 size={14} className="mr-2" />
              Delete Page
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default SourcePageItem;
