import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRAGServices } from '@/hooks/useRAGServices';
import { toast } from '@/hooks/use-toast';
import { AgentSource } from '@/types/rag';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSourceDetail = () => {
  const { agentId, sourceId, pageId } = useParams();
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
      if (!sourceId && !pageId) return;
      
      try {
        setLoading(true);
        
        if (pageId) {
          // Fetch child page data
          const { data: pageData, error } = await supabase
            .from('source_pages')
            .select('*')
            .eq('id', pageId)
            .single();

          if (error) throw error;

          // Fetch the actual content from source_chunks table
          const { data: chunkData, error: chunkError } = await supabase
            .from('source_chunks')
            .select('content')
            .eq('source_id', pageId)
            .order('chunk_index');

          let extractedContent = 'No content available';
          if (!chunkError && chunkData && chunkData.length > 0) {
            extractedContent = chunkData.map(chunk => chunk.content).join('\n\n');
          }

          // Transform child page data to AgentSource format
          const transformedSource: AgentSource = {
            id: pageData.id,
            title: pageData.url,
            content: extractedContent,
            url: pageData.url,
            source_type: 'website',
            agent_id: agentId || '',
            is_active: true,
            created_at: pageData.created_at,
            updated_at: pageData.updated_at,
            requires_manual_training: false,
            metadata: {
              isChildPage: true,
              parentSourceId: pageData.parent_source_id,
              contentSize: pageData.content_size,
              chunksCreated: pageData.chunks_created,
              processingTimeMs: pageData.processing_time_ms,
              compressionRatio: pageData.compression_ratio,
              duplicatesFound: pageData.duplicates_found
            }
          };

          setSource(transformedSource);
          setEditTitle(transformedSource.title);
          setEditContent(transformedSource.content || '');
        } else if (sourceId) {
          // Fetch regular source data
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
  }, [sourceId, pageId, sources, agentId]);

  const handleSave = async () => {
    if (!source || pageId) return; // Don't allow editing child pages

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

    console.log('🗑️ Starting source deletion:', {
      sourceId: source.id,
      sourceType: source.source_type,
      agentId,
      isChildPage: !!pageId
    });

    setIsDeleting(true);
    try {
      if (pageId) {
        // Delete child page
        const { error } = await supabase
          .from('source_pages')
          .delete()
          .eq('id', pageId);

        if (error) throw error;
      } else {
        // Delete regular source
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
        description: pageId ? 'Page deleted successfully' : 'Source deleted successfully',
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
        description: pageId ? 'Failed to delete page' : 'Failed to delete source',
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
