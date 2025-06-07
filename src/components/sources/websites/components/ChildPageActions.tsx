
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  RefreshCw, 
  Trash2,
  MoreHorizontal,
  ChevronDown
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import WebsiteActionConfirmDialog from './WebsiteActionConfirmDialog';
import { useChildPageOperations } from '../hooks/useChildPageOperations';
import { useChildPageRealtimeStatus } from '../hooks/useChildPageRealtimeStatus';

interface ChildPageActionsProps {
  url: string;
  pageId: string;
  parentSourceId: string;
  initialStatus: string;
  onDelete?: () => void;
}

type ConfirmationType = 'recrawl' | 'delete' | null;

const ChildPageActions: React.FC<ChildPageActionsProps> = ({
  url,
  pageId,
  parentSourceId,
  initialStatus,
  onDelete
}) => {
  const [confirmationType, setConfirmationType] = useState<ConfirmationType>(null);
  const { recrawlChildPage, isLoading } = useChildPageOperations();
  const { displayStatus } = useChildPageRealtimeStatus({ 
    pageId, 
    parentSourceId, 
    initialStatus 
  });
  const navigate = useNavigate();
  const { agentId } = useParams();

  const handleRecrawlClick = () => {
    setConfirmationType('recrawl');
  };

  const handleDeleteClick = () => {
    setConfirmationType('delete');
  };

  const handleViewClick = () => {
    if (agentId) {
      navigate(`/agent/${agentId}/sources/page/${pageId}`);
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
  const isViewEnabled = displayStatus === 'trained';

  return (
    <div className="flex items-center gap-2">
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

      <Button
        variant="ghost"
        size="sm"
        onClick={handleViewClick}
        disabled={!isViewEnabled}
        className="h-6 w-6 p-0"
        title={isViewEnabled ? "View source details" : "Available after training is complete"}
      >
        <ChevronDown className={`w-3 h-3 ${!isViewEnabled ? 'text-gray-400' : ''}`} />
      </Button>

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
