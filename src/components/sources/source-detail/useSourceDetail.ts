
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AgentSource } from '@/types/rag';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSourceDetail = () => {
  const { sourceId, agentId } = useParams<{ sourceId: string; agentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const { data: source, isLoading: loading, refetch } = useQuery({
    queryKey: ['agent-source', sourceId],
    queryFn: async () => {
      if (!sourceId) return null;
      
      const { data, error } = await supabase
        .from('agent_sources')
        .select('*')
        .eq('id', sourceId)
        .single();

      if (error) throw error;
      return data as AgentSource;
    },
    enabled: !!sourceId
  });

  useEffect(() => {
    if (source) {
      setEditTitle(source.title);
      setEditContent(source.content || '');
    }
  }, [source]);

  const handleSave = async () => {
    if (!sourceId || !source) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('agent_sources')
        .update({
          title: editTitle,
          content: editContent,
        })
        .eq('id', sourceId);

      if (error) throw error;

      toast({
        title: 'Source Updated',
        description: 'Source details have been updated successfully.',
      });

      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['agent-source', sourceId] });
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = useCallback(async () => {
    if (!sourceId) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('agent_sources')
        .delete()
        .eq('id', sourceId);

      if (error) throw error;

      toast({
        title: 'Source Deleted',
        description: 'Source has been deleted successfully.',
      });

      navigate(`/agent/${agentId}/sources`);
      queryClient.invalidateQueries({ queryKey: ['agent-sources', agentId] });
    } catch (error: any) {
      toast({
        title: 'Deletion Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [sourceId, agentId, navigate, queryClient, toast]);

  const handleBackClick = () => {
    navigate(`/agent/${agentId}/sources`);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (source) {
      setEditTitle(source.title);
      setEditContent(source.content || '');
    }
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
    agentId: agentId!,
    refetch
  };
};
