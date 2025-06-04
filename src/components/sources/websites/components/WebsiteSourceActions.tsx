
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
import { AgentSource } from '@/types/rag';
import WebsiteActionConfirmDialog from './WebsiteActionConfirmDialog';
import WebsiteSourceStatusBadges from './WebsiteSourceStatusBadges';

interface WebsiteSourceActionsProps {
  source: AgentSource;
  hasChildSources?: boolean;
  isExpanded?: boolean;
  onEdit?: () => void;
  onExclude?: () => void;
  onRecrawl?: () => void;
  onDelete?: () => void;
  onToggleExpanded?: () => void;
  isChild?: boolean;
}

type ConfirmationType = 'recrawl' | 'exclude' | 'delete' | null;

const WebsiteSourceActions: React.FC<WebsiteSourceActionsProps> = ({
  source,
  hasChildSources = false,
  isExpanded = false,
  onEdit,
  onExclude,
  onRecrawl,
  onDelete,
  onToggleExpanded,
  isChild = false
}) => {
  const [confirmationType, setConfirmationType] = useState<ConfirmationType>(null);

  const handleRecrawlClick = () => {
    setConfirmationType('recrawl');
  };

  const handleExcludeClick = () => {
    setConfirmationType('exclude');
  };

  const handleDeleteClick = () => {
    setConfirmationType('delete');
  };

  const handleConfirm = () => {
    switch (confirmationType) {
      case 'recrawl':
        onRecrawl?.();
        break;
      case 'exclude':
        onExclude?.();
        break;
      case 'delete':
        onDelete?.();
        break;
    }
    setConfirmationType(null);
  };

  const getConfirmationConfig = () => {
    switch (confirmationType) {
      case 'recrawl':
        return {
          title: 'Confirm Recrawl',
          description: `Are you sure you want to recrawl "${source.url}"? This will refresh all content and may take some time to complete.`,
          confirmText: 'Recrawl',
          isDestructive: false
        };
      case 'exclude':
        return {
          title: `${source.is_excluded ? 'Include' : 'Exclude'} Source`,
          description: `Are you sure you want to ${source.is_excluded ? 'include' : 'exclude'} "${source.url}"? ${source.is_excluded ? 'This will make the content available for AI responses.' : 'This will hide the content from AI responses.'}`,
          confirmText: source.is_excluded ? 'Include' : 'Exclude',
          isDestructive: !source.is_excluded
        };
      case 'delete':
        return {
          title: 'Delete Source',
          description: `Are you sure you want to permanently delete "${source.url}"? This action cannot be undone and will remove all associated content and embeddings.`,
          confirmText: 'Delete',
          isDestructive: true
        };
      default:
        return {
          title: '',
          description: '',
          confirmText: '',
          isDestructive: false
        };
    }
  };

  const confirmConfig = getConfirmationConfig();

  return (
    <div className="flex items-center gap-2 ml-4">
      {/* Status Badge - positioned next to the actions */}
      <WebsiteSourceStatusBadges
        crawlStatus={source.crawl_status}
        isExcluded={source.is_excluded}
        linksCount={source.links_count || 0}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <MoreHorizontal className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => window.open(source.url, '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Open URL
          </DropdownMenuItem>
          
          {onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit URL
            </DropdownMenuItem>
          )}
          
          {onExclude && (
            <DropdownMenuItem onClick={handleExcludeClick}>
              {source.is_excluded ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
              {source.is_excluded ? 'Include' : 'Exclude'}
            </DropdownMenuItem>
          )}
          
          {onRecrawl && (
            <DropdownMenuItem onClick={handleRecrawlClick}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Recrawl
            </DropdownMenuItem>
          )}
          
          {onDelete && (
            <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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

      <WebsiteActionConfirmDialog
        open={confirmationType !== null}
        onOpenChange={(open) => !open && setConfirmationType(null)}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmText={confirmConfig.confirmText}
        onConfirm={handleConfirm}
        isDestructive={confirmConfig.isDestructive}
      />
    </div>
  );
};

export default WebsiteSourceActions;
