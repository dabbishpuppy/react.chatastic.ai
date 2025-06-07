
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  RefreshCw, 
  Trash2,
  MoreHorizontal,
  ChevronRight
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import WebsiteActionConfirmDialog from './WebsiteActionConfirmDialog';
import { useChildPageOperations } from '../hooks/useChildPageOperations';
import { useChildPageStatus } from '../hooks/useChildPageStatus';

interface ChildPageActionsProps {
  url: string;
  pageId: string;
  parentSourceId: string;
  status: string;
  onDelete?: () => void;
}

type ConfirmationType = 'recrawl' | 'delete' | null;

const ChildPageActions: React.FC<ChildPageActionsProps> = ({
  url,
  pageId,
  parentSourceId,
  status,
  onDelete
}) => {
  const [confirmationType, setConfirmationType] = useState<ConfirmationType>(null);
  const { recrawlChildPage, isLoading } = useChildPageOperations();
  const { displayStatus } = useChildPageStatus({ status, parentSourceId, pageId });
  const navigate = useNavigate();
  const { agentId } = useParams();

  // Debug logging to understand status
  console.log('ChildPageActions status debug:', {
    pageId,
    originalStatus: status,
    displayStatus,
    url
  });

  // Check if the page is ready for viewing (training completed)
  const isViewable = displayStatus === 'trained' || displayStatus === 'completed' || status === 'completed';

  console.log('ChildPageActions viewability:', {
    pageId,
    isViewable,
    displayStatus,
    originalStatus: status
  });

  const handleRecrawlClick = () => {
    setConfirmationType('recrawl');
  };

  const handleDeleteClick = () => {
    setConfirmationType('delete');
  };

  const handleViewClick = () => {
    console.log('View click attempted:', { isViewable, agentId, pageId });
    if (isViewable && agentId) {
      console.log('Navigating to:', `/agent/${agentId}/sources/website/${pageId}`);
      navigate(`/agent/${agentId}/sources/website/${pageId}`);
    }
  };

  const handleConfirm = async () => {
    switch (confirmationType) {
      case 'recrawl':
        try {
          await recrawlChildPage({
            id: pageId,
            url: url,
            status: 'pending',
            parent_source_id: parentSourceId
          });
        } catch (error) {
          console.error('Recrawl failed:', error);
        }
        break;
      case 'delete':
        if (onDelete) {
          await onDelete();
        }
        break;
    }
    setConfirmationType(null);
  };

  const getConfirmationConfig = () => {
    switch (confirmationType) {
      case 'recrawl':
        return {
          title: 'Confirm Recrawl',
          description: `Are you sure you want to recrawl "${url}"? This will refresh the content and may take some time to complete.`,
          confirmText: 'Recrawl',
          isDestructive: false
        };
      case 'delete':
        return {
          title: 'Delete Page',
          description: `Are you sure you want to permanently delete "${url}"? This action cannot be undone.`,
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

  const getViewTooltip = () => {
    if (isViewable) {
      return 'View extracted content';
    }
    return 'Content will be available after training is completed';
  };

  return (
    <div className="flex items-center gap-2">
      {/* Right arrow for viewing source details - only for child pages */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={isViewable ? handleViewClick : undefined}
              disabled={!isViewable}
              className={`h-6 w-6 p-0 ${!isViewable ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
            >
              <ChevronRight className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getViewTooltip()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

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
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem onClick={handleRecrawlClick} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Recrawl
          </DropdownMenuItem>
          
          {onDelete && (
            <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <WebsiteActionConfirmDialog
        open={confirmationType !== null}
        onOpenChange={(open) => !open && setConfirmationType(null)}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmText={confirmConfig.confirmText}
        onConfirm={handleConfirm}
        isDestructive={confirmConfig.isDestructive}
        disabled={isLoading}
      />
    </div>
  );
};

export default ChildPageActions;
