
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ExternalLink, 
  Edit2, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Zap, 
  Trash2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
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
  return (
    <div className="flex items-center gap-1 ml-4">
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

      {onEdit && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="h-6 w-6 p-0"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit URL</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {onExclude && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onExclude}
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
      )}

      {showRecrawl && onRecrawl && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRecrawl}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Recrawl</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {!isChild && onEnhancedRecrawl && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onEnhancedRecrawl}
                className="h-6 w-6 p-0"
              >
                <Zap className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Enhanced Recrawl (Better Content Extraction)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {onDelete && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
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
      )}

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
    </div>
  );
};

export default WebsiteSourceActions;
