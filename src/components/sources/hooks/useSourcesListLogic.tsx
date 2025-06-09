
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgentSource } from '@/types/rag';
import { useRAGServices } from '@/hooks/useRAGServices';
import { toast } from '@/hooks/use-toast';

export const useSourcesListLogic = (
  sources: AgentSource[] | undefined,
  onSourceDeleted?: (sourceId: string) => void
) => {
  const navigate = useNavigate();
  const { sources: sourceService } = useRAGServices();
  const [deleteSource, setDeleteSource] = useState<AgentSource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Ensure optimisticSources is always an array
  const optimisticSources = useMemo(() => {
    return sources || [];
  }, [sources]);

  const handleDeleteClick = useCallback((source: AgentSource) => {
    setDeleteSource(source);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteSource) return;

    setIsDeleting(true);
    try {
      await sourceService.deleteSource(deleteSource.id);
      
      toast({
        title: "Success",
        description: "Source deleted successfully"
      });

      onSourceDeleted?.(deleteSource.id);
      setDeleteSource(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete source",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  }, [deleteSource, sourceService, onSourceDeleted]);

  const handleRowClick = useCallback((source: AgentSource) => {
    // Navigate to source detail page
    navigate(`/agent/${source.agent_id}/sources/${source.id}`);
  }, [navigate]);

  return {
    optimisticSources,
    deleteSource,
    isDeleting,
    setDeleteSource,
    handleDeleteClick,
    handleDeleteConfirm,
    handleRowClick
  };
};
