
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
import { SimpleStatusService } from '@/services/SimpleStatusService';
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
  const [sourceData, setSourceData] = useState<any>(null);
  const { recrawlChildPage, isLoading } = useChildPageOperations();
  const navigate = useNavigate();
  const { agentId } = useParams();

  // Fetch source data to determine status
  React.useEffect(() => {
    const fetchSourceData = async () => {
      const { data } = await supabase
        .from('agent_sources')
        .select('*')
        .eq('id', pageId)
        .single();
      
      setSourceData(data);
    };
    
    fetchSourceData();
  }, [pageId]);

  const displayStatus = sourceData ? SimpleStatusService.getSourceStatus(sourceData) : status;
  const isRemoved = displayStatus === 'removed';

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
          // Mark as removed instead of hard delete
          await supabase
            .from('agent_sources')
            .update({ is_excluded: true })
            .eq('id', pageId);
          
          console.log('Source marked as removed');
        } catch (error) {
          console.error('Delete failed:', error);
        }
        break;
      case 'restore':
        try {
          // Restore by removing the excluded flag
          await supabase
            .from('agent_sources')
            .update({ is_excluded: false })
            .eq('id', pageId);
          
          console.log('Source restored');
          setSourceData(prev => ({ ...prev, is_excluded: false }));
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
          title: 'Remove Page',
          description: `Are you sure you want to remove "${url}"? It will be marked for deletion and removed during the next training.`,
          confirmText: 'Remove',
          isDestructive: true
        };
      case 'restore':
        return {
          title: 'Restore Page',
          description: `Are you sure you want to restore "${url}"? It will be included in future training.`,
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
              Remove
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
