import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AgentSource } from '@/types/rag';
import { SourcePage } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fetchMaybeSingle } from '@/utils/safeSupabaseQueries';

export const useSourceDetail = () => {
  const { sourceId, agentId, pageId } = useParams<{ sourceId: string; agentId: string; pageId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Determine if this is a source page (website child source) or regular source
  const isSourcePage = !!pageId;
  const currentId = isSourcePage ? pageId : sourceId;

  const { data: source, isLoading: loading, refetch } = useQuery({
    queryKey: isSourcePage ? ['source-page', pageId] : ['agent-source', sourceId],
    queryFn: async () => {
      if (!currentId) return null;
      
      try {
        if (isSourcePage) {
          // Fetch from source_pages table for website child sources
          const data = await fetchMaybeSingle(
            supabase
              .from('source_pages')
              .select('*')
              .eq('id', pageId),
            `useSourceDetail(page:${pageId})`
          ) as SourcePage | null;
          
          // Transform source page data to match AgentSource interface
          if (data) {
            return {
              id: data.id,
              title: data.url || `Page ${data.id.slice(0, 8)}`,
              content: '', // Will be populated with chunks below
              source_type: 'website' as const,
              url: data.url,
              agent_id: agentId!,
              team_id: data.customer_id, // Map customer_id to team_id
              is_active: true,
              created_at: data.created_at,
              updated_at: data.updated_at,
              metadata: {
                isChildPage: true,
                status: data.status,
                contentSize: data.content_size,
                chunksCreated: data.chunks_created,
                processingTimeMs: data.processing_time_ms,
                compressionRatio: data.compression_ratio,
                parentSourceId: data.parent_source_id,
                workflowStatus: data.workflow_status,
                previousStatus: data.previous_status,
                errorMessage: data.error_message,
                contentHash: data.content_hash,
                retryCount: data.retry_count,
                maxRetries: data.max_retries,
                duplicatesFound: data.duplicates_found,
                startedAt: data.started_at,
                completedAt: data.completed_at
              }
            } as AgentSource;
          }
          return null;
        } else {
          // Fetch from agent_sources table for regular sources
          const data = await fetchMaybeSingle(
            supabase
              .from('agent_sources')
              .select('*')
              .eq('id', sourceId),
            `useSourceDetail(${sourceId})`
          ) as AgentSource | null;
          
          return data;
        }
      } catch (error) {
        console.error('Failed to fetch source:', error);
        return null;
      }
    },
    enabled: !!currentId
  });

  // Fetch chunks - FIXED: Use parent source ID for source pages and filter by page
  const { data: chunks } = useQuery({
    queryKey: ['source-chunks', currentId, isSourcePage ? source?.metadata?.parentSourceId : null],
    queryFn: async () => {
      if (!currentId) return [];
      
      try {
        console.log('🔍 Fetching chunks for:', { currentId, isSourcePage, source });
        
        let chunksData;
        let sourceIdForQuery = currentId;
        
        if (isSourcePage && source?.metadata?.parentSourceId) {
          // For source pages, chunks are stored under the parent source ID
          sourceIdForQuery = source.metadata.parentSourceId;
          console.log('🔍 Using parent source ID for chunks:', sourceIdForQuery);
        }
        
        const { data, error } = await supabase
          .from('source_chunks')
          .select('*')
          .eq('source_id', sourceIdForQuery)
          .order('chunk_index', { ascending: true });

        if (error) {
          console.error('Failed to fetch chunks:', error);
          return [];
        }
        
        chunksData = data || [];
        
        // For source pages, we need to filter chunks that belong to this specific page
        // Since all child page chunks are stored under the parent, we'll show all chunks for now
        // In the future, we could add page-specific metadata to chunks to filter them
        if (isSourcePage) {
          console.log('✅ Found chunks for source page (showing all parent chunks):', chunksData.length);
          // TODO: Add logic to filter chunks by specific page if needed
          // For now, showing all chunks under the parent source
        } else {
          console.log('✅ Found chunks for regular source:', chunksData.length);
        }
        
        return chunksData;
      } catch (error) {
        console.error('Failed to fetch chunks:', error);
        return [];
      }
    },
    enabled: !!currentId && (isSourcePage ? !!source?.metadata?.parentSourceId : true)
  });

  // Combine chunks into content for source pages
  useEffect(() => {
    if (source && isSourcePage && chunks) {
      const combinedContent = chunks.map(chunk => chunk.content).join('\n\n');
      // Update the source object with the combined content
      if (combinedContent) {
        source.content = combinedContent;
      }
    }
  }, [source, chunks, isSourcePage]);

  useEffect(() => {
    if (source) {
      setEditTitle(source.title);
      setEditContent(source.content || '');
    }
  }, [source]);

  const handleSave = async () => {
    if (!currentId || !source) return;

    setIsSaving(true);
    try {
      if (isSourcePage) {
        // Update source page - note: source pages don't have editable content in the same way
        // This is mainly for future extensibility
        const { error } = await supabase
          .from('source_pages')
          .update({
            // Source pages don't have a content field that can be edited
            // We could add other editable fields here in the future
            updated_at: new Date().toISOString(),
          })
          .eq('id', pageId);

        if (error) throw error;
      } else {
        // Update regular source
        const { error } = await supabase
          .from('agent_sources')
          .update({
            title: editTitle,
            content: editContent,
          })
          .eq('id', sourceId);

        if (error) throw error;
      }

      toast({
        title: 'Source Updated',
        description: 'Source details have been updated successfully.',
      });

      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: isSourcePage ? ['source-page', pageId] : ['agent-source', sourceId] });
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
    if (!currentId) return;

    setIsDeleting(true);
    try {
      if (isSourcePage) {
        // Delete source page
        const { error } = await supabase
          .from('source_pages')
          .delete()
          .eq('id', pageId);

        if (error) throw error;

        toast({
          title: 'Page Deleted',
          description: 'Source page has been deleted successfully.',
        });

        // Navigate back to parent source
        if (source?.metadata?.parentSourceId) {
          navigate(`/agent/${agentId}/sources/${source.metadata.parentSourceId}`);
        } else {
          navigate(`/agent/${agentId}/sources`);
        }
      } else {
        // Delete regular source
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
      }

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
  }, [currentId, agentId, navigate, queryClient, toast, isSourcePage, pageId, sourceId, source]);

  const handleBackClick = () => {
    if (isSourcePage && source?.metadata?.parentSourceId) {
      // Navigate back to parent source detail page
      navigate(`/agent/${agentId}/sources/${source.metadata.parentSourceId}`);
    } else {
      // Navigate back to sources list
      navigate(`/agent/${agentId}/sources`);
    }
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
    refetch,
    isSourcePage,
    chunks: chunks || []
  };
};
