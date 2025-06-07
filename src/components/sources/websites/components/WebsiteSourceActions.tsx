
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
import { useWebsiteSourceOperations } from '../hooks/useWebsiteSourceOperations';
import { SimpleStatusService } from '@/services/SimpleStatusService';
import { supabase } from '@/integrations/supabase/client';
import { AgentSource } from '@/types/rag';

interface WebsiteSourceActionsProps {
  source: AgentSource;
  hasChildSources?: boolean;
  isExpanded?: boolean;
  onEdit: () => void;
  onExclude: () => void;
  onRecrawl: () => void;
  onDelete: () => void;
  onToggleExpanded?: () => void;
}

type ConfirmationType = 'recrawl' | 'delete' | 'restore' | null;

const WebsiteSourceActions: React.FC<WebsiteSourceActionsProps> = ({
  source,
  hasChildSources = false,
  isExpanded = false,
  onEdit,
  onExclude,
  onRecrawl,
  onDelete,
  onToggleExpanded
}) => {
  const [confirmationType, setConfirmationType] = useState<ConfirmationType>(null);
  const [sourceData, setSourceData] = useState<any>(source);
  const { handleRecrawl, handleDelete: handleDeleteOperation } = useWebsiteSourceOperations(() => {}, () => {});
  const navigate = useNavigate();
  const { agentId } = useParams();

  // Fetch source data to determine status
  React.useEffect(() => {
    if (source) {
      setSourceData(source);
      return;
    }

    const fetchSourceData = async () => {
      const { data } = await supabase
        .from('agent_sources')
        .select('*')
        .eq('id', source.id)
        .single();
      
      setSourceData(data);
    };
    
    fetchSourceData();
  }, [source.id, source]);

  const displayStatus = sourceData ? SimpleStatusService.getSourceStatus(sourceData) : 'crawling';
  const isPendingDeletion = sourceData?.pending_deletion === true;
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
      navigate(`/agent/${agentId}/sources/page/${source.id}`);
    }
  };

  const handleConfirm = async () => {
    switch (confirmationType) {
      case 'recrawl':
        try {
          await handleRecrawl(source);
          onRecrawl();
        } catch (error) {
          console.error('Recrawl failed:', error);
        }
        break;
      case 'delete':
        try {
          // Soft delete: mark as pending deletion instead of hard delete
          await supabase
            .from('agent_sources')
            .update({ pending_deletion: true })
            .eq('id', source.id);
          
          console.log('Source marked for deletion');
          setSourceData(prev => ({ ...prev, pending_deletion: true }));
          onDelete();
        } catch (error) {
          console.error('Soft delete failed:', error);
        }
        break;
      case 'restore':
        try {
          // Restore by removing the pending deletion flag
          await supabase
            .from('agent_sources')
            .update({ 
              pending_deletion: false,
              is_excluded: false 
            })
            .eq('id', source.id);
          
          console.log('Source restored');
          setSourceData(prev => ({ 
            ...prev, 
            pending_deletion: false,
            is_excluded: false 
          }));
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
          description: `Are you sure you want to recrawl "${source.url}"? This will refresh the content and may take some time to complete.`,
          confirmText: 'Recrawl',
          isDestructive: false
        };
      case 'delete':
        return {
          title: 'Remove Source',
          description: `Are you sure you want to remove "${source.url}"? It will be marked for deletion and removed during the next training.`,
          confirmText: 'Remove',
          isDestructive: true
        };
      case 'restore':
        return {
          title: 'Restore Source',
          description: `Are you sure you want to restore "${source.url}"? It will be included in future training.`,
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
          {!isPendingDeletion && (
            <DropdownMenuItem onClick={handleRecrawlClick}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Recrawl
            </DropdownMenuItem>
          )}
          
          {isPendingDeletion ? (
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

      {/* Show expand/collapse button only for parent sources with children */}
      {hasChildSources && onToggleExpanded && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpanded}
          className="h-6 w-6 p-0"
          title={isExpanded ? "Collapse child pages" : "Expand child pages"}
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </Button>
      )}

      <WebsiteActionConfirmDialog
        open={confirmationType !== null}
        onOpenChange={(open) => !open && setConfirmationType(null)}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmText={confirmConfig.confirmText}
        onConfirm={handleConfirm}
        isDestructive={confirmConfig.isDestructive}
        disabled={false}
      />
    </div>
  );
};

export default WebsiteSourceActions;
