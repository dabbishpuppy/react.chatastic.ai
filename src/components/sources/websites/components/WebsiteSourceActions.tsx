
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
  onEdit?: (sourceId: string, newUrl: string) => void;
  onExclude?: (source: AgentSource) => void;
  onRecrawl?: (source: AgentSource) => void;
  onEnhancedRecrawl?: () => void;
  onDelete?: (source: AgentSource) => void;
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
  const handleEdit = () => {
    if (onEdit) {
      onEdit(source.id, source.url);
    }
  };

  const handleExclude = () => {
    if (onExclude) {
      onExclude(source);
    }
  };

  const handleRecrawl = () => {
    if (onRecrawl) {
      onRecrawl(source);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(source);
    }
  };

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
                onClick={handleEdit}
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
                onClick={handleExclude}
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
                onClick={handleRecrawl}
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
                className="h-6 w-6 p-0 text-blue-600"
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
                onClick={handleDelete}
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

      {!isChild && onToggleExpanded && (
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
              <p>{isExpanded ? 'Collapse' : 'Expand'} {hasChildSources ? 'child sources' : 'details'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default WebsiteSourceActions;
