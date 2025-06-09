import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  RefreshCw, 
  Trash2,
  MoreHorizontal,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import WebsiteActionConfirmDialog from './WebsiteActionConfirmDialog';
import { useChildPageOperations } from '../hooks/useChildPageOperations';
import { supabase } from '@/integrations/supabase/client';

interface ChildPageActionsProps {
  url: string;
  pageId: string;
  parentSourceId: string;
  status: string;
  onDelete?: () => void;
}

type ConfirmationType = 'recrawl' | 'delete' | 'restore' | null;

const ChildPageActions: React.FC<ChildPageActionsProps> = ({
  url,
  pageId,
  parentSourceId,
  status,
  onDelete
}) => {
  const [confirmationType, setConfirmationType] = useState<ConfirmationType>(null);
  const { recrawlChildPage, isLoading } = useChildPageOperations();
  const navigate = useNavigate();
  const { agentId } = useParams();

  // Use the status prop directly instead of fetching from database
  const displayStatus = status;
  const isRemoved = displayStatus === 'removed' || displayStatus === 'failed';

  const handleRecrawlClick = () => {
    setConfirmationType('recrawl');
  };

  const handleDeleteClick = () => {
    setConfirmationType('delete');
  };

  const handleRestoreClick = () => {
    setConfirmationType('restore');
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
        try {
          console.log('🗑️ Starting source page deletion:', pageId);
          
          // Step 1: Delete background jobs first to avoid foreign key constraint violation
          const { error: jobsError } = await supabase
            .from('background_jobs')
            .delete()
            .eq('page_id', pageId);

          if (jobsError) {
            console.warn('Warning: Failed to delete background jobs:', jobsError.message);
            // Continue with deletion even if this fails
          } else {
            console.log('✅ Successfully deleted background jobs for page:', pageId);
          }

          // Step 2: Now delete from source_pages table
          const { error: pageError } = await supabase
            .from('source_pages')
            .delete()
            .eq('id', pageId);

          if (pageError) {
            throw new Error(`Failed to delete source page: ${pageError.message}`);
          }

          console.log('✅ Source page deleted successfully:', pageId);
          
          // Call the onDelete callback if provided
          if (onDelete) {
            onDelete();
          }
        } catch (error) {
          console.error('❌ Delete failed:', error);
        }
        break;
      case 'restore':
        try {
          // Restore by updating the status in source_pages table
          const { error } = await supabase
            .from('source_pages')
            .update({ status: 'pending' })
            .eq('id', pageId);
          
          if (error) {
            throw new Error(`Failed to restore source page: ${error.message}`);
          }
          
          console.log('Source page restored');
        } catch (error) {
          console.error('Restore failed:', error);
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
          title: 'Delete Source',
          description: `Are you sure you want to permanently delete "${url}"? This action cannot be undone and will remove all associated data.`,
          confirmText: 'Delete',
          isDestructive: true
        };
      case 'restore':
        return {
          title: 'Restore Source',
          description: `Are you sure you want to restore "${url}"? It will be included in future processing.`,
          confirmText: 'Restore',
          isDestructive: false
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
  const isViewEnabled = displayStatus === 'completed';

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
          {!isRemoved && (
            <DropdownMenuItem onClick={handleRecrawlClick} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Recrawl
            </DropdownMenuItem>
          )}
          
          {isRemoved ? (
            <DropdownMenuItem onClick={handleRestoreClick}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restore
            </DropdownMenuItem>
          ) : (
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
        title={isViewEnabled ? "View source details" : "Available after processing is complete"}
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
