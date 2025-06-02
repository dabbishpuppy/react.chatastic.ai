
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRAGServices } from '@/hooks/useRAGServices';
import { toast } from '@/hooks/use-toast';
import { AgentSource } from '@/types/rag';
import { useQueryClient } from '@tanstack/react-query';

export const useSourceDetail = () => {
  const { agentId, sourceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { sources } = useRAGServices();
  
  const [source, setSource] = useState<AgentSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    const fetchSource = async () => {
      if (!sourceId) return;
      
      try {
        setLoading(true);
        const sourceData = await sources.getSourceWithStats(sourceId);
        setSource(sourceData);
        setEditTitle(sourceData.title);
        setEditContent(sourceData.content || '');
      } catch (error) {
        console.error('Error fetching source:', error);
        toast({
          title: 'Error',
          description: 'Failed to load source details',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSource();
  }, [sourceId, sources]);

  const handleSave = async () => {
    if (!source) return;

    setIsSaving(true);
    try {
      await sources.updateSource(source.id, {
        title: editTitle,
        content: editContent,
      });

      setSource(prev => prev ? {
        ...prev,
        title: editTitle,
        content: editContent,
      } : null);

      setIsEditing(false);
      
      toast({
        title: 'Success',
        description: 'Source updated successfully',
      });
    } catch (error) {
      console.error('Error updating source:', error);
      toast({
        title: 'Error',
        description: 'Failed to update source',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!source || !agentId) return;

    setIsDeleting(true);
    try {
      await sources.deleteSource(source.id);
      
      // Invalidate all relevant queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      queryClient.invalidateQueries({ queryKey: ['sources', agentId] });
      queryClient.invalidateQueries({ queryKey: ['sources', agentId, source.source_type] });
      
      toast({
        title: 'Success',
        description: 'Source deleted successfully',
      });

      // Navigate back to the appropriate tab based on source type
      const tabMap: Record<string, string> = {
        'qa': 'qa',
        'text': 'text',
        'website': 'website',
        'file': 'files'
      };
      
      const tab = tabMap[source.source_type] || 'files';
      navigate(`/agent/${agentId}/sources?tab=${tab}`);
    } catch (error) {
      console.error('Error deleting source:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete source',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleBackClick = () => {
    if (!agentId || !source) return;
    
    // Navigate back to the appropriate tab based on source type
    const tabMap: Record<string, string> = {
      'qa': 'qa',
      'text': 'text',
      'website': 'website',
      'file': 'files'
    };
    
    const tab = tabMap[source.source_type] || 'files';
    navigate(`/agent/${agentId}/sources?tab=${tab}`);
  };

  const handleCancelEdit = () => {
    if (!source) return;
    
    setEditTitle(source.title);
    setEditContent(source.content || '');
    setIsEditing(false);
  };

  return {
    source,
    loading,
    isEditing,
    isSaving,
    isDeleting,
    showDeleteDialog,
    editTitle,
    editContent,
    setIsEditing,
    setShowDeleteDialog,
    setEditTitle,
    setEditContent,
    handleSave,
    handleDelete,
    handleBackClick,
    handleCancelEdit,
    agentId
  };
};
