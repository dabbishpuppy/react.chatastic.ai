
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ExternalLink, 
  Edit2, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Trash2,
  ChevronDown,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AgentSource } from '@/types/rag';

interface WebsiteSourceActionsProps {
  source: AgentSource;
  hasChildSources?: boolean;
  isExpanded?: boolean;
  onEdit?: () => void;
  onExclude?: () => void;
  onRecrawl?: () => void;
  onEnhancedRecrawl?: () => void;
  onDelete?: () => void;
  onToggleExpanded?: () => void;
  showRecrawl?: boolean;
  isChild?: boolean;
}

const WebsiteSourceActions: React.FC<WebsiteSourceActionsProps> = ({
  source,
  hasChildSources = false,
  isExpanded = false,
  onEdit,
  onExclude,
  onRecrawl,
  onEnhancedRecrawl,
  onDelete,
  onToggleExpanded,
  showRecrawl = true,
  isChild = false
}) => {
  const handleOpenUrl = () => {
    window.open(source.url, '_blank');
  };

  // For parent sources: only show expand/collapse and 3-dots menu
  if (!isChild) {
    return (
      <div className="flex items-center gap-1 ml-4">
        {/* Always show expand/collapse arrow for parent sources (when onToggleExpanded is provided) */}
        {onToggleExpanded && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleExpanded}
                  className="h-6 w-6 p-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isExpanded ? 'Collapse' : 'Expand'} child sources</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* 3-dots dropdown menu for parent sources */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleOpenUrl}>
              <ExternalLink className="mr-2 h-3 w-3" />
              Open URL
            </DropdownMenuItem>
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="mr-2 h-3 w-3" />
                Edit URL
              </DropdownMenuItem>
            )}
            {onExclude && (
              <DropdownMenuItem onClick={onExclude}>
                {source.is_excluded ? <Eye className="mr-2 h-3 w-3" /> : <EyeOff className="mr-2 h-3 w-3" />}
                {source.is_excluded ? 'Include' : 'Exclude'}
              </DropdownMenuItem>
            )}
            {showRecrawl && onRecrawl && (
              <DropdownMenuItem onClick={onRecrawl}>
                <RefreshCw className="mr-2 h-3 w-3" />
                Recrawl
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="mr-2 h-3 w-3" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // For child sources: only show 3-dots menu
  return (
    <div className="flex items-center gap-1 ml-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreHorizontal className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleOpenUrl}>
            <ExternalLink className="mr-2 h-3 w-3" />
            Open URL
          </DropdownMenuItem>
          {onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Edit2 className="mr-2 h-3 w-3" />
              Edit URL
            </DropdownMenuItem>
          )}
          {onExclude && (
            <DropdownMenuItem onClick={onExclude}>
              {source.is_excluded ? <Eye className="mr-2 h-3 w-3" /> : <EyeOff className="mr-2 h-3 w-3" />}
              {source.is_excluded ? 'Include' : 'Exclude'}
            </DropdownMenuItem>
          )}
          {showRecrawl && onRecrawl && (
            <DropdownMenuItem onClick={onRecrawl}>
              <RefreshCw className="mr-2 h-3 w-3" />
              Recrawl
            </DropdownMenuItem>
          )}
          {onDelete && (
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="mr-2 h-3 w-3" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default WebsiteSourceActions;
