
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { AgentSource } from '@/types/rag';
import { AgentSourceService } from '@/services/rag/agentSourceService';

export const useSourcesActions = (refetch: () => void) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = async (sourceId: string, newValue: string) => {
    try {
      await AgentSourceService.updateSource(sourceId, {
        title: newValue
      });
      
      toast({
        title: 'Source updated',
        description: 'Source has been updated successfully.',
      });
      
      refetch();
    } catch (error) {
      console.error('Error updating source:', error);
      toast({
        title: 'Error',
        description: 'Failed to update source. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (source: AgentSource) => {
    setIsDeleting(true);
    try {
      await AgentSourceService.deleteSource(source.id);
      
      toast({
        title: 'Source deleted',
        description: `"${source.title}" has been deleted successfully.`,
      });
      
      refetch();
    } catch (error) {
      console.error('Error deleting source:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete source. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async (sourceIds: string[]) => {
    setIsDeleting(true);
    try {
      await Promise.all(
        sourceIds.map(id => AgentSourceService.deleteSource(id))
      );
      
      toast({
        title: 'Sources deleted',
        description: `${sourceIds.length} sources have been deleted successfully.`,
      });
      
      refetch();
    } catch (error) {
      console.error('Error deleting sources:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete some sources. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    handleEdit,
    handleDelete,
    handleBulkDelete,
    isDeleting
  };
};
