
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AgentSource } from '@/types/rag';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fetchMaybeSingle } from '@/utils/safeSupabaseQueries';

export const useSourceDetail = () => {
  const { sourceId, agentId, pageId } = useParams<{ sourceId?: string; agentId: string; pageId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Determine if we're viewing a page source or regular source
  const isPageSource = !!pageId;
  const targetId = pageId || sourceId;

  const { data: source, isLoading: loading, refetch } = useQuery({
    queryKey: ['source-detail', targetId, isPageSource],
    queryFn: async () => {
      if (!targetId) return null;
      
      try {
        if (isPageSource) {
          // Fetch from source_pages table
          const data = await fetchMaybeSingle(
            supabase
              .from('source_pages')
              .select('*')
              .eq('id', targetId),
            `useSourceDetail-page(${targetId})`
          );
          
          return data;
        } else {
          // Fetch from agent_sources table
          const data = await fetchMaybeSingle(
            supabase
              .from('agent_sources')
              .select('*')
              .eq('id', targetId),
            `useSourceDetail-source(${targetId})`
          ) as AgentSource | null;
          
          return data;
        }
      } catch (error) {
        console.error('Failed to fetch source:', error);
        return null;
      }
    },
    enabled: !!targetId
  });

  useEffect(() => {
    if (source) {
      setEditTitle(source.title || source.url || '');
      setEditContent(source.content || '');
    }
  }, [source]);

  const handleSave = async () => {
    if (!targetId || !source) return;

    setIsSaving(true);
    try {
      const tableName = isPageSource ? 'source_pages' : 'agent_sources';
      const { error } = await supabase
        .from(tableName)
        .update({
          title: editTitle,
          content: editContent,
        })
        .eq('id', targetId);

      if (error) throw error;

      toast({
        title: `${isPageSource ? 'Page' : 'Source'} Updated`,
        description: `${isPageSource ? 'Page' : 'Source'} details have been updated successfully.`,
      });

      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['source-detail', targetId, isPageSource] });
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
    if (!targetId) return;

    setIsDeleting(true);
    try {
      const tableName = isPageSource ? 'source_pages' : 'agent_sources';
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', targetId);

      if (error) throw error;

      toast({
        title: `${isPageSource ? 'Page' : 'Source'} Deleted`,
        description: `${isPageSource ? 'Page' : 'Source'} has been deleted successfully.`,
      });

      navigate(`/agent/${agentId}/sources`);
      if (!isPageSource) {
        queryClient.invalidateQueries({ queryKey: ['agent-sources', agentId] });
      }
    } catch (error: any) {
      toast({
        title: 'Deletion Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [targetId, agentId, navigate, queryClient, toast, isPageSource]);

  const handleBackClick = () => {
    navigate(`/agent/${agentId}/sources`);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (source) {
      setEditTitle(source.title || source.url || '');
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
    refetch,
    isPageSource
  };
};
