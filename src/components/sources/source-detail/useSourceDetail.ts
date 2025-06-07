
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRAGServices } from '@/hooks/useRAGServices';
import { toast } from '@/hooks/use-toast';
import { AgentSource } from '@/types/rag';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

  // Check if this is a website source page by looking at the URL
  const isWebsiteSourcePage = window.location.pathname.includes('/sources/website/');

  useEffect(() => {
    const fetchSource = async () => {
      if (!sourceId) return;
      
      try {
        setLoading(true);
        
        if (isWebsiteSourcePage) {
          // Fetch from source_pages table for website child pages
          const { data: pageData, error: pageError } = await supabase
            .from('source_pages')
            .select('*')
            .eq('id', sourceId)
            .single();

          if (pageError) {
            console.error('Error fetching source page:', pageError);
            throw pageError;
          }

          if (pageData) {
            // Transform source_pages data to match AgentSource interface
            const transformedSource: AgentSource = {
              id: pageData.id,
              title: pageData.url,
              content: 'Extracted content will be shown here', // Placeholder for now
              url: pageData.url,
              source_type: 'website',
              agent_id: agentId || '',
              team_id: '', // Will be filled from parent source if needed
              created_at: pageData.created_at,
              updated_at: pageData.updated_at,
              is_active: true,
              metadata: {
                content_size: pageData.content_size,
                chunks_created: pageData.chunks_created,
                processing_time_ms: pageData.processing_time_ms,
                status: pageData.status
              },
              parent_source_id: pageData.parent_source_id,
              crawl_status: pageData.status,
              is_excluded: false,
              requires_manual_training: false
            };
            
            setSource(transformedSource);
            setEditTitle(transformedSource.title);
            setEditContent(transformedSource.content || '');
          }
        } else {
          // Regular source fetch for other source types
          const sourceData = await sources.getSourceWithStats(sourceId);
          setSource(sourceData);
          setEditTitle(sourceData.title);
          setEditContent(sourceData.content || '');
        }
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
  }, [sourceId, sources, isWebsiteSourcePage, agentId]);

  const handleSave = async () => {
    if (!source) return;

    setIsSaving(true);
    try {
      if (isWebsiteSourcePage) {
        // For website sources, we might not allow editing initially
        toast({
          title: 'Info',
          description: 'Editing website source content is not available yet',
          variant: 'default',
        });
        return;
      }

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

    console.log('🗑️ Starting source deletion:', {
      sourceId: source.id,
      sourceType: source.source_type,
      agentId,
      isWebsiteSourcePage
    });

    setIsDeleting(true);
    try {
      if (isWebsiteSourcePage) {
        // Delete from source_pages table
        const { error } = await supabase
          .from('source_pages')
          .delete()
          .eq('id', source.id);

        if (error) {
          throw error;
        }
      } else {
        // Regular source deletion
        await sources.deleteSource(source.id);
      }
      
      // Comprehensive query invalidation for all source types
      const queryKeysToInvalidate = [
        ['sources'],
        ['sources', agentId],
        ['sources', agentId, source.source_type],
        ['sources', agentId, 'qa'],
        ['sources', agentId, 'file'],
        ['sources', agentId, 'text'],
        ['sources', agentId, 'website']
      ];

      queryKeysToInvalidate.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
      
      // Also remove the specific source from cache
      queryClient.removeQueries({ queryKey: ['source', source.id] });
      
      console.log('✅ Source deleted and queries invalidated');
      
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
      console.error('❌ Error deleting source:', error);
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
    agentId,
    isWebsiteSourcePage
  };
};
