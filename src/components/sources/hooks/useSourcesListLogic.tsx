
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRAGServices } from '@/hooks/useRAGServices';
import { toast } from '@/hooks/use-toast';
import { AgentSource } from '@/types/rag';

export const useSourcesListLogic = (
  sources: AgentSource[],
  onSourceDeleted?: (sourceId: string) => void
) => {
  const navigate = useNavigate();
  const { agentId } = useParams();
  const { sources: sourceService } = useRAGServices();
  
  const [deleteSource, setDeleteSource] = useState<AgentSource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [optimisticSources, setOptimisticSources] = useState<AgentSource[]>(sources);

  // Update optimistic sources when props change
  React.useEffect(() => {
    setOptimisticSources(sources);
  }, [sources]);

  const handleDeleteClick = (source: AgentSource) => {
    setDeleteSource(source);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteSource) return;

    try {
      setIsDeleting(true);
      
      // Optimistically remove the source from the list
      setOptimisticSources(prev => prev.filter(s => s.id !== deleteSource.id));
      
      // Call the API to delete the source
      await sourceService.deleteSource(deleteSource.id);
      
      toast({
        title: "Success",
        description: "Source deleted successfully"
      });
      
      // Notify parent component with the source ID for efficient state updates
      if (onSourceDeleted) {
        onSourceDeleted(deleteSource.id);
      }
    } catch (error) {
      console.error('Error deleting source:', error);
      
      // Revert optimistic update on error
      setOptimisticSources(sources);
      
      toast({
        title: "Error",
        description: "Failed to delete source",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setDeleteSource(null);
    }
  };

  const handleRowClick = (source: AgentSource) => {
    navigate(`/agent/${agentId}/sources/${source.id}`);
  };

  const handleNavigateClick = (source: AgentSource, event: React.MouseEvent) => {
    event.stopPropagation();
    navigate(`/agent/${agentId}/sources/${source.id}`);
  };

  return {
    optimisticSources,
    deleteSource,
    isDeleting,
    setDeleteSource,
    handleDeleteClick,
    handleDeleteConfirm,
    handleRowClick,
    handleNavigateClick
  };
};
