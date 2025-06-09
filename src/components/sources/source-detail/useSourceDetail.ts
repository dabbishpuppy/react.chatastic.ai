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

  // ENHANCED: Better chunk fetching with comprehensive debugging and fallback strategies
  const { data: chunks } = useQuery({
    queryKey: ['source-chunks', currentId, isSourcePage ? source?.metadata?.parentSourceId : null, isSourcePage ? pageId : null],
    queryFn: async () => {
      if (!currentId) return [];
      
      try {
        console.log('🔍 Fetching chunks for:', { 
          currentId, 
          isSourcePage, 
          pageId, 
          parentSourceId: source?.metadata?.parentSourceId,
          pageUrl: source?.url
        });
        
        let chunksData;
        let sourceIdForQuery = currentId;
        
        if (isSourcePage && source?.metadata?.parentSourceId) {
          // For source pages, chunks are stored under the parent source ID
          sourceIdForQuery = source.metadata.parentSourceId;
          console.log('🔍 Using parent source ID for chunks:', sourceIdForQuery);
        }
        
        // Get ALL chunks for this source to debug
        const { data: allChunks, error: allChunksError } = await supabase
          .from('source_chunks')
          .select('*')
          .eq('source_id', sourceIdForQuery)
          .order('chunk_index', { ascending: true });

        if (allChunksError) {
          console.error('Failed to fetch chunks:', allChunksError);
          return [];
        }
        
        console.log('🔍 ALL chunks for source:', {
          sourceId: sourceIdForQuery,
          totalChunks: allChunks?.length || 0,
          chunks: allChunks?.map(c => ({
            id: c.id,
            chunk_index: c.chunk_index,
            metadata: c.metadata,
            content_preview: c.content?.substring(0, 100)
          }))
        });

        if (isSourcePage && pageId) {
          // ENHANCED: Try multiple strategies to find page-specific chunks
          let pageSpecificChunks = [];

          // Strategy 1: Filter by metadata.page_id
          pageSpecificChunks = allChunks?.filter(chunk => {
            const metadata = chunk.metadata as Record<string, any> | null;
            return metadata?.page_id === pageId;
          }) || [];
          
          console.log('🔍 Strategy 1 (metadata.page_id):', pageSpecificChunks.length);

          // Strategy 2: If no results, try metadata.pageId
          if (pageSpecificChunks.length === 0) {
            pageSpecificChunks = allChunks?.filter(chunk => {
              const metadata = chunk.metadata as Record<string, any> | null;
              return metadata?.pageId === pageId;
            }) || [];
            console.log('🔍 Strategy 2 (metadata.pageId):', pageSpecificChunks.length);
          }

          // Strategy 3: If still no results, try metadata.source_page_id
          if (pageSpecificChunks.length === 0) {
            pageSpecificChunks = allChunks?.filter(chunk => {
              const metadata = chunk.metadata as Record<string, any> | null;
              return metadata?.source_page_id === pageId;
            }) || [];
            console.log('🔍 Strategy 3 (metadata.source_page_id):', pageSpecificChunks.length);
          }

          // Strategy 4: If still no results, check if metadata contains the pageId as a value
          if (pageSpecificChunks.length === 0) {
            pageSpecificChunks = allChunks?.filter(chunk => {
              const metadata = chunk.metadata as Record<string, any> | null;
              if (!metadata) return false;
              return Object.values(metadata).includes(pageId);
            }) || [];
            console.log('🔍 Strategy 4 (pageId in metadata values):', pageSpecificChunks.length);
          }

          // Strategy 5: Check if URL matches in metadata
          if (pageSpecificChunks.length === 0 && source?.url) {
            pageSpecificChunks = allChunks?.filter(chunk => {
              const metadata = chunk.metadata as Record<string, any> | null;
              return metadata?.url === source.url;
            }) || [];
            console.log('🔍 Strategy 5 (metadata.url match):', pageSpecificChunks.length, 'for URL:', source.url);
          }

          // NEW Strategy 6: Direct query for chunks with this page's URL (in case it's stored in content or different field)
          if (pageSpecificChunks.length === 0 && source?.url) {
            try {
              const { data: urlBasedChunks } = await supabase
                .from('source_chunks')
                .select('*')
                .eq('source_id', sourceIdForQuery)
                .or(`content.ilike.%${source.url}%,metadata->>url.eq.${source.url}`);
              
              pageSpecificChunks = urlBasedChunks || [];
              console.log('🔍 Strategy 6 (URL in content/metadata):', pageSpecificChunks.length);
            } catch (error) {
              console.warn('Strategy 6 failed:', error);
            }
          }

          chunksData = pageSpecificChunks;
          
          console.log('✅ Found page-specific chunks:', {
            pageId,
            pageUrl: source?.url,
            chunksFound: chunksData.length,
            expectedChunks: source?.metadata?.chunksCreated || 0,
            sampleChunk: chunksData[0] ? {
              id: chunksData[0].id,
              metadata: chunksData[0].metadata,
              contentPreview: chunksData[0].content?.substring(0, 100)
            } : null
          });

          // ENHANCED: Check for incomplete chunking (major content discrepancy)
          if (chunksData.length > 0 && source?.metadata?.chunksCreated && chunksData.length < source.metadata.chunksCreated) {
            const expectedChunks = source.metadata.chunksCreated;
            const foundChunks = chunksData.length;
            const discrepancyRatio = foundChunks / expectedChunks;
            
            console.warn('⚠️ INCOMPLETE CHUNKING DETECTED:');
            console.warn('⚠️ Expected chunks:', expectedChunks);
            console.warn('⚠️ Found chunks:', foundChunks);
            console.warn('⚠️ Discrepancy ratio:', discrepancyRatio);
            
            // If we have less than 50% of expected chunks, this is likely incomplete processing
            if (discrepancyRatio < 0.5) {
              console.warn('⚠️ CRITICAL: Less than 50% of expected chunks found');
              console.warn('⚠️ This indicates incomplete content processing');
              console.warn('⚠️ Automatic reprocessing may be needed');
            }
          }
        } else {
          chunksData = allChunks || [];
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

  // ENHANCED: Combine chunks into content for source pages and auto-process if needed
  useEffect(() => {
    if (source && isSourcePage && chunks) {
      console.log('🔄 Processing chunks for display:', {
        sourceId: source.id,
        chunksLength: chunks.length,
        expectedChunks: source.metadata?.chunksCreated
      });

      if (chunks.length > 0) {
        // Sort chunks by index and combine content
        const sortedChunks = [...chunks].sort((a, b) => (a.chunk_index || 0) - (b.chunk_index || 0));
        const combinedContent = sortedChunks.map(chunk => chunk.content).filter(Boolean).join('\n\n');
        
        console.log('✅ Combined content length:', combinedContent.length);
        
        // Update the source object with the combined content
        if (combinedContent.trim()) {
          source.content = combinedContent;
        }
        
        // Check for incomplete content and suggest reprocessing
        if (source.metadata?.chunksCreated && chunks.length < source.metadata.chunksCreated) {
          const discrepancyRatio = chunks.length / source.metadata.chunksCreated;
          if (discrepancyRatio < 0.5) {
            console.log('🔄 Significant chunk discrepancy detected - suggesting reprocessing');
            toast({
              title: 'Incomplete Content Detected',
              description: `This page appears to have incomplete content (${chunks.length}/${source.metadata.chunksCreated} chunks). Consider reprocessing.`,
              variant: 'default',
            });
          }
        }
      } else if (source.metadata?.status === 'completed' && source.metadata?.chunksCreated > 0) {
        // Auto-trigger reprocessing if page is completed but no chunks found
        console.log('🔄 Auto-triggering reprocessing due to missing chunks');
        triggerReprocessing();
      }
    }
  }, [source, chunks, isSourcePage]);

  // Enhanced reprocessing with better diagnostics
  const triggerReprocessing = useCallback(async () => {
    if (!isSourcePage || !pageId) return;
    
    try {
      console.log('🔄 Triggering reprocessing for page:', pageId);
      
      const { data, error } = await supabase.functions.invoke('process-page-content', {
        body: { 
          pageId,
          forceReprocess: true // Force reprocessing even if page was already processed
        }
      });

      if (error) {
        console.error('Failed to trigger reprocessing:', error);
        toast({
          title: 'Reprocessing Failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        console.log('✅ Reprocessing triggered successfully:', data);
        toast({
          title: 'Reprocessing Started',
          description: 'Page content is being reprocessed. Refresh in a few moments.',
        });
        
        // Invalidate and refetch chunks after a delay
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['source-chunks'] });
          refetch?.();
        }, 5000);
      }
    } catch (error) {
      console.error('Error triggering reprocessing:', error);
      toast({
        title: 'Reprocessing Failed',
        description: 'An unexpected error occurred while triggering reprocessing.',
        variant: 'destructive',
      });
    }
  }, [isSourcePage, pageId, toast, queryClient, refetch]);

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
    chunks: chunks || [],
    triggerReprocessing
  };
};
