
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MoreHorizontal, 
  ChevronDown, 
  ChevronRight,
  Link, 
  RefreshCw,
  Edit,
  EyeOff,
  Trash2,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AgentSource } from '@/types/rag';
import { formatDistanceToNow } from 'date-fns';

interface WebsiteSourceItemProps {
  source: AgentSource;
  childSources?: AgentSource[];
  onEdit: (source: AgentSource) => void;
  onExclude: (source: AgentSource) => void;
  onDelete: (source: AgentSource) => void;
  onRecrawl: (source: AgentSource) => void;
}

const WebsiteSourceItem: React.FC<WebsiteSourceItemProps> = ({
  source,
  childSources = [],
  onEdit,
  onExclude,
  onDelete,
  onRecrawl
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isParentSource = !source.parent_source_id;
  const showToggle = isParentSource; // Always show toggle for parent sources
  const hasChildSources = childSources.length > 0;
  const isCrawling = source.crawl_status === 'in_progress' || source.crawl_status === 'pending';

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'Crawling in-progress';
      case 'failed': return 'Failed';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg">
      {/* Main source item */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center flex-1">
          <input 
            type="checkbox" 
            className="rounded border-gray-300 text-black focus:ring-black mr-4" 
          />
          
          {showToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 mr-2"
              onClick={() => setIsExpanded(!isExpanded)}
              disabled={!hasChildSources && !isCrawling}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </Button>
          )}
          
          <div className="bg-gray-100 rounded-full p-2 mr-3">
            <Link className="h-5 w-5 text-gray-600" />
          </div>
          
          <div className="flex-1">
            <div className="font-medium">{source.title || source.url}</div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Added {formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}</span>
              {source.links_count && source.links_count > 0 && (
                <span>• {source.links_count} links</span>
              )}
              {source.last_crawled_at && (
                <span>• Last crawled {formatDistanceToNow(new Date(source.last_crawled_at), { addSuffix: true })}</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(source.crawl_status)}>
              {isCrawling && (
                <Loader2 size={14} className="mr-1 animate-spin" />
              )}
              {getStatusText(source.crawl_status)}
            </Badge>
            
            {source.crawl_status === 'in_progress' && source.progress && (
              <div className="w-20 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${source.progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-1 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRecrawl(source)}
            disabled={source.crawl_status === 'in_progress' || source.crawl_status === 'pending'}
          >
            {(source.crawl_status === 'in_progress' || source.crawl_status === 'pending') ? (
              <Loader2 size={16} className="mr-1 animate-spin" />
            ) : (
              <RefreshCw size={16} className="mr-1" />
            )}
            Recrawl
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onEdit(source)}>
                <Edit size={16} className="mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExclude(source)}>
                <EyeOff size={16} className="mr-2" />
                {source.is_excluded ? 'Include' : 'Exclude'} link
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(source)}
                className="text-red-600"
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Child sources (crawled links) or loading state */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50">
          {/* Show loading state if crawling in progress but no child sources yet */}
          {isCrawling && childSources.length === 0 && (
            <div className="flex items-center justify-center py-6 text-gray-500">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              <span>Crawling in progress...</span>
            </div>
          )}
          
          {/* Show child sources when available */}
          {childSources.map((childSource) => (
            <div key={childSource.id} className="flex items-center justify-between p-3 pl-16 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center flex-1">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-black focus:ring-black mr-4" 
                />
                <div className="bg-gray-100 rounded-full p-1 mr-3">
                  <Link className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{childSource.title || childSource.url}</div>
                  <div className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(childSource.created_at), { addSuffix: true })}
                  </div>
                </div>
                <Badge className={`${getStatusColor(childSource.crawl_status)} text-xs`}>
                  {getStatusText(childSource.crawl_status)}
                </Badge>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => onEdit(childSource)}>
                    <Edit size={14} className="mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExclude(childSource)}>
                    <EyeOff size={14} className="mr-2" />
                    {childSource.is_excluded ? 'Include' : 'Exclude'} link
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(childSource)}
                    className="text-red-600"
                  >
                    <Trash2 size={14} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          
          {/* Show message if no child sources and not loading */}
          {!isCrawling && childSources.length === 0 && (
            <div className="flex items-center justify-center py-6 text-gray-500">
              <span>No links discovered</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WebsiteSourceItem;
