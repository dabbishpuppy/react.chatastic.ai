
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink, Eye, EyeOff, Trash2 } from 'lucide-react';
import { AgentSource } from '@/types/rag';

interface WebsiteSourceChildListProps {
  childSources: AgentSource[];
  onExclude: (source: AgentSource) => void;
  onDelete: (source: AgentSource) => void;
}

const WebsiteSourceChildList: React.FC<WebsiteSourceChildListProps> = ({
  childSources,
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

  // Truncate URL if it's longer than 70 characters and add 3 dots
  const truncateUrl = (url: string) => {
    if (url.length <= 70) return url;
    return url.substring(0, 70) + '...';
  };

  return (
    <div className="mt-4 pl-6 border-l-2 border-gray-200">
      <div className="space-y-3">
        {childSources.map((childSource) => (
          <div key={childSource.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md border">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Badge 
                variant="outline" 
                className={`${getStatusColor(childSource.crawl_status)} text-white text-xs px-2 py-0`}
              >
                {getStatusText(childSource.crawl_status)}
              </Badge>
              
              {childSource.is_excluded && (
                <Badge variant="secondary" className="text-xs px-2 py-0">
                  <EyeOff className="w-2 h-2 mr-1" />
                  Excluded
                </Badge>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900" title={childSource.url}>
                  {childSource.title || formatUrl(childSource.url)}
                </p>
                <p className="text-xs text-gray-500" title={childSource.url}>{truncateUrl(childSource.url)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(childSource.url, '_blank')}
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
                      onClick={() => onExclude(childSource)}
                      className="h-6 w-6 p-0"
                    >
                      {childSource.is_excluded ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{childSource.is_excluded ? 'Include' : 'Exclude'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(childSource)}
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
        ))}
      </div>
    </div>
  );
};

export default WebsiteSourceChildList;
