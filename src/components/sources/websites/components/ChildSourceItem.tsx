
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink, Eye, EyeOff, Trash2 } from 'lucide-react';
import { AgentSource } from '@/types/rag';

interface ChildSourceItemProps {
  source: AgentSource;
  onExclude: (source: AgentSource) => void;
  onDelete: (source: AgentSource) => void;
}

const ChildSourceItem: React.FC<ChildSourceItemProps> = ({
  source,
  onExclude,
  onDelete
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return url;
    }
  };

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md border">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Badge 
          variant="outline" 
          className={`${getStatusColor(source.crawl_status)} text-white text-xs px-2 py-0`}
        >
          {getStatusText(source.crawl_status)}
        </Badge>
        
        {source.is_excluded && (
          <Badge variant="secondary" className="text-xs px-2 py-0">
            <EyeOff className="w-2 h-2 mr-1" />
            Excluded
          </Badge>
        )}
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate" title={source.url}>
            {source.title || formatUrl(source.url)}
          </p>
          <p className="text-xs text-gray-500 truncate">{source.url}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(source.url, '_blank')}
                className="h-6 w-6 p-0"
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open URL</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onExclude(source)}
                className="h-6 w-6 p-0"
              >
                {source.is_excluded ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{source.is_excluded ? 'Include' : 'Exclude'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(source)}
                className="h-6 w-6 p-0 text-red-600"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default ChildSourceItem;
