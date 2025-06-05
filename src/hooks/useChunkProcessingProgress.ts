
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';

interface ChunkProcessingProgress {
  totalSources: number;
  processedSources: number;
  totalPages: number;
  processedPages: number;
  chunksCreated: number;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentlyProcessing: string[];
}

export const useChunkProcessingProgress = () => {
  const { agentId } = useParams();
  
  // CRITICAL: All hooks must be called consistently - no conditional hooks
  const [progress, setProgress] = useState<ChunkProcessingProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const lastUpdateRef = useRef<number>(0);
  const subscriptionsRef = useRef<any[]>([]);
  const isProcessingStatusChangeRef = useRef<boolean>(false);
  
  // CRITICAL: Enhanced completion state management - always initialize
  const completionStateRef = useRef<{
    isCompleted: boolean;
    completedAt: number | null;
    sessionId: string | null;
    lastValidationAt: number | null;
  }>({
    isCompleted: false,
    completedAt: null,
    sessionId: null,
    lastValidationAt: null
  });

  // Enhanced validation function to check actual completion state
  const validateActualCompletion = async (): Promise<boolean> => {
    if (!agentId) return false;

    try {
      // Get all sources for this agent
      const { data: sources } = await supabase
        .from('agent_sources')
        .select('id, source_type, metadata')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (!sources || sources.length === 0) {
        console.log('🔍 No sources found for agent');
        return false;
      }

      let allProcessed = true;
      let totalChunksWithEmbeddings = 0;

      for (const source of sources) {
        if (source.source_type === 'website') {
          // For website sources, check pages
          const { data: pages } = await supabase
            .from('source_pages')
            .select('id, processing_status')
            .eq('parent_source_id', source.id)
            .eq('status', 'completed');

          if (!pages || pages.length === 0) {
            console.log(`🔍 Website source ${source.id} has no completed pages`);
            allProcessed = false;
            continue;
          }

          const unprocessedPages = pages.filter(p => p.processing_status !== 'processed');
          if (unprocessedPages.length > 0) {
            console.log(`🔍 Website source ${source.id} has ${unprocessedPages.length} unprocessed pages`);
            allProcessed = false;
            continue;
          }

          // Check if pages have chunks with embeddings
          for (const page of pages) {
            const { data: pageChunks } = await supabase
              .from('source_chunks')
              .select(`
                id,
                source_embeddings(id)
              `)
              .eq('source_id', page.id);

            if (!pageChunks || pageChunks.length === 0) {
              console.log(`🔍 Page ${page.id} has no chunks`);
              allProcessed = false;
              break;
            }

            const chunksWithEmbeddings = pageChunks.filter(c => c.source_embeddings && c.source_embeddings.length > 0);
            if (chunksWithEmbeddings.length !== pageChunks.length) {
              console.log(`🔍 Page ${page.id} has chunks without embeddings: ${pageChunks.length - chunksWithEmbeddings.length} missing`);
              allProcessed = false;
              break;
            }

            totalChunksWithEmbeddings += chunksWithEmbeddings.length;
          }

          if (!allProcessed) break;

        } else {
          // For non-website sources, check metadata and chunks directly
          const metadata = source.metadata as any || {};
          
          if (metadata.processing_status !== 'completed') {
            console.log(`🔍 Source ${source.id} not marked as completed in metadata`);
            allProcessed = false;
            continue;
          }

          // Check if source has chunks with embeddings
          const { data: sourceChunks } = await supabase
            .from('source_chunks')
            .select(`
              id,
              source_embeddings(id)
            `)
            .eq('source_id', source.id);

          if (!sourceChunks || sourceChunks.length === 0) {
            console.log(`🔍 Source ${source.id} has no chunks`);
            allProcessed = false;
            continue;
          }

          const chunksWithEmbeddings = sourceChunks.filter(c => c.source_embeddings && c.source_embeddings.length > 0);
          if (chunksWithEmbeddings.length !== sourceChunks.length) {
            console.log(`🔍 Source ${source.id} has chunks without embeddings: ${sourceChunks.length - chunksWithEmbeddings.length} missing`);
            allProcessed = false;
            continue;
          }

          totalChunksWithEmbeddings += chunksWithEmbeddings.length;
        }
      }

      console.log(`🔍 Validation result: allProcessed=${allProcessed}, totalChunksWithEmbeddings=${totalChunksWithEmbeddings}`);
      return allProcessed && totalChunksWithEmbeddings > 0;

    } catch (error) {
      console.error('❌ Error validating completion:', error);
      return false;
    }
  };

  // Calculate progress from database state with enhanced completion detection
  const calculateProgress = async () => {
    if (!agentId) return;
    
    // CRITICAL: Don't calculate if already completed and recently validated
    const now = Date.now();
    if (completionStateRef.current.isCompleted && 
        completionStateRef.current.lastValidationAt && 
        (now - completionStateRef.current.lastValidationAt) < 30000) { // 30 seconds
      console.log('🚫 Progress calculation blocked - recently validated as completed');
      return;
    }

    // CRITICAL: Prevent concurrent status changes
    if (isProcessingStatusChangeRef.current) {
      console.log('🚫 Progress calculation blocked - already processing status change');
      return;
    }

    try {
      if (now - lastUpdateRef.current < 2000) return; // Debounce
      lastUpdateRef.current = now;

      isProcessingStatusChangeRef.current = true;

      // Get all agent sources
      const { data: sources } = await supabase
        .from('agent_sources')
        .select('id, source_type, metadata, title')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (!sources) {
        isProcessingStatusChangeRef.current = false;
        return;
      }

      let totalSources = 0;
      let processedSources = 0;
      let totalPages = 0;
      let processedPages = 0;
      let chunksCreated = 0;
      let currentlyProcessing: string[] = [];
      let hasFailures = false;
      let hasProcessing = false;

      for (const source of sources) {
        if (source.source_type === 'website') {
          // For website sources, check child pages
          const { data: pages } = await supabase
            .from('source_pages')
            .select('id, url, processing_status, chunks_created')
            .eq('parent_source_id', source.id)
            .eq('status', 'completed');

          if (pages && pages.length > 0) {
            totalSources += 1;
            totalPages += pages.length;
            
            const processed = pages.filter(p => p.processing_status === 'processed');
            const processing = pages.filter(p => p.processing_status === 'processing');
            const failed = pages.filter(p => p.processing_status === 'failed');
            
            processedPages += processed.length;
            chunksCreated += processed.reduce((sum, p) => sum + (p.chunks_created || 0), 0);
            
            if (processing.length > 0) {
              hasProcessing = true;
              currentlyProcessing.push(...processing.map(p => p.url || p.id));
            }
            
            if (failed.length > 0) {
              hasFailures = true;
            }
            
            // Source is processed if all pages are processed
            if (processed.length === pages.length) {
              processedSources += 1;
            }
          }
        } else {
          // For non-website sources, check metadata
          totalSources += 1;
          const metadata = source.metadata as any || {};
          
          if (metadata.processing_status === 'completed') {
            processedSources += 1;
            totalPages += 1;
            processedPages += 1;
            chunksCreated += metadata.chunks_created || 0;
          } else if (metadata.processing_status === 'processing') {
            hasProcessing = true;
            currentlyProcessing.push(source.title);
            totalPages += 1;
          } else if (metadata.processing_status === 'failed') {
            hasFailures = true;
            totalPages += 1;
          } else {
            totalPages += 1;
          }
        }
      }

      // Calculate overall progress
      const overallProgress = totalPages > 0 ? Math.round((processedPages / totalPages) * 100) : 0;

      // Enhanced status determination with validation
      let status: 'idle' | 'processing' | 'completed' | 'failed' = 'idle';
      
      if (hasFailures && !hasProcessing && processedPages === 0) {
        status = 'failed';
      } else if (hasProcessing || currentlyProcessing.length > 0) {
        status = 'processing';
      } else if (totalPages > 0 && processedPages === totalPages && overallProgress >= 100) {
        // Potential completion - validate with actual data
        console.log('🎯 Potential completion detected, validating...');
        const actuallyCompleted = await validateActualCompletion();
        
        if (actuallyCompleted) {
          status = 'completed';
          
          // CRITICAL: Set permanent completion lock with validation timestamp
          if (!completionStateRef.current.isCompleted) {
            console.log('🎉 TRAINING ACTUALLY COMPLETED - Setting permanent completion lock with validation');
            completionStateRef.current = {
              isCompleted: true,
              completedAt: Date.now(),
              sessionId: completionStateRef.current.sessionId,
              lastValidationAt: Date.now()
            };
            
            // Immediately cleanup subscriptions
            cleanupSubscriptions();
          } else {
            // Update validation timestamp
            completionStateRef.current.lastValidationAt = Date.now();
          }
        } else {
          console.log('🔍 Validation failed - not actually completed yet');
          // Force processing status if validation fails
          status = 'processing';
          hasProcessing = true;
        }
      }

      // CRITICAL: Only update progress if not completed OR if this is a completion update
      if (!completionStateRef.current.isCompleted || status === 'completed') {
        const newProgress = {
          totalSources,
          processedSources,
          totalPages,
          processedPages,
          chunksCreated,
          status,
          progress: status === 'completed' ? 100 : overallProgress, // Force 100% on completion
          currentlyProcessing: status === 'completed' ? [] : currentlyProcessing // Clear processing on completion
        };

        setProgress(newProgress);

        console.log('📊 Chunk processing progress updated:', {
          status,
          progress: newProgress.progress,
          processedPages,
          totalPages,
          chunksCreated,
          currentlyProcessing: currentlyProcessing.length,
          isCompleted: completionStateRef.current.isCompleted,
          hasValidation: completionStateRef.current.lastValidationAt !== null
        });
      } else {
        console.log('🚫 Progress update blocked - training permanently completed');
      }

    } catch (error) {
      console.error('Error calculating chunk processing progress:', error);
    } finally {
      isProcessingStatusChangeRef.current = false;
    }
  };

  // Function to cleanup subscriptions
  const cleanupSubscriptions = () => {
    console.log('🧹 Cleaning up chunk processing subscriptions after completion');
    subscriptionsRef.current.forEach(channel => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    });
    subscriptionsRef.current = [];
  };

  // Recovery mechanism for stuck states
  const recoverFromStuckState = async () => {
    if (!agentId) return;

    console.log('🔧 Attempting to recover from stuck state...');
    
    try {
      const actuallyCompleted = await validateActualCompletion();
      
      if (actuallyCompleted) {
        console.log('🎉 Recovery: Training is actually completed! Forcing completion state.');
        
        // Force completion state
        completionStateRef.current = {
          isCompleted: true,
          completedAt: Date.now(),
          sessionId: completionStateRef.current.sessionId || `recovery-${Date.now()}`,
          lastValidationAt: Date.now()
        };

        // Set final completed progress
        setProgress({
          totalSources: 0,
          processedSources: 0,
          totalPages: 0,
          processedPages: 0,
          chunksCreated: 0,
          status: 'completed',
          progress: 100,
          currentlyProcessing: []
        });

        // Cleanup subscriptions
        cleanupSubscriptions();

        console.log('✅ Recovery completed - training state fixed');
        return true;
      }
    } catch (error) {
      console.error('❌ Recovery failed:', error);
    }
    
    return false;
  };

  // Set up real-time subscriptions with recovery logic
  useEffect(() => {
    if (!agentId) return;

    // CRITICAL: Don't setup subscriptions if already completed
    if (completionStateRef.current.isCompleted) {
      console.log('🚫 Subscriptions blocked - training already completed');
      return;
    }

    console.log('🔄 Setting up chunk processing progress tracking for agent:', agentId);

    const setupSubscriptions = async () => {
      // Subscribe to source_pages changes
      const pageChannel = supabase
        .channel(`chunk-progress-pages-${agentId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'source_pages'
          },
          () => {
            if (!completionStateRef.current.isCompleted) {
              console.log('📄 Source page updated, recalculating progress');
              setTimeout(calculateProgress, 1000);
            } else {
              console.log('🚫 Source page update ignored - training completed');
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'source_chunks'
          },
          () => {
            if (!completionStateRef.current.isCompleted) {
              console.log('🧩 Source chunk updated, recalculating progress');
              setTimeout(calculateProgress, 1000);
            } else {
              console.log('🚫 Source chunk update ignored - training completed');
            }
          }
        )
        .subscribe((status) => {
          console.log('📄 Page subscription status:', status);
          setIsConnected(status === 'SUBSCRIBED');
        });

      // Subscribe to agent_sources changes
      const sourceChannel = supabase
        .channel(`chunk-progress-sources-${agentId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'agent_sources',
            filter: `agent_id=eq.${agentId}`
          },
          () => {
            if (!completionStateRef.current.isCompleted) {
              console.log('📚 Agent source updated, recalculating progress');
              setTimeout(calculateProgress, 1000);
            } else {
              console.log('🚫 Agent source update ignored - training completed');
            }
          }
        )
        .subscribe();

      // Store subscriptions for cleanup
      subscriptionsRef.current = [pageChannel, sourceChannel];

      // Initial calculation
      if (!completionStateRef.current.isCompleted) {
        calculateProgress();
        
        // Set up recovery timer for stuck states
        const recoveryTimer = setTimeout(async () => {
          if (!completionStateRef.current.isCompleted) {
            console.log('🔧 Progress seems stuck, attempting recovery...');
            await recoverFromStuckState();
          }
        }, 30000); // 30 seconds

        return () => clearTimeout(recoveryTimer);
      }
    };

    setupSubscriptions();

    return () => {
      cleanupSubscriptions();
    };
  }, [agentId]);

  // Start chunk processing for an agent
  const startChunkProcessing = async () => {
    if (!agentId) return;

    try {
      console.log('🚀 Starting chunk processing for agent:', agentId);

      // CRITICAL: Reset completion state and create stable session ID
      const newSessionId = `training-${agentId}-${Date.now()}`;
      completionStateRef.current = {
        isCompleted: false,
        completedAt: null,
        sessionId: newSessionId,
        lastValidationAt: null
      };

      console.log('✅ New chunk processing session started with ID:', newSessionId);

      // Get all agent sources that need processing
      const { data: sources } = await supabase
        .from('agent_sources')
        .select('id, source_type, metadata')
        .eq('agent_id', agentId)
        .eq('is_active', true);

      if (!sources || sources.length === 0) {
        console.log('No sources found for processing');
        return;
      }

      // Process each source
      const processingPromises = sources.map(async (source) => {
        if (source.source_type === 'website') {
          // For website sources, trigger page processing
          console.log(`🌐 Triggering page processing for website source: ${source.id}`);
          return supabase.functions.invoke('process-crawled-pages', {
            body: { parentSourceId: source.id }
          });
        } else {
          // For non-website sources, process directly
          console.log(`📄 Processing non-website source: ${source.id}`);
          return supabase.functions.invoke('process-page-content', {
            body: { sourceId: source.id }
          });
        }
      });

      // Start all processing in parallel
      const results = await Promise.allSettled(processingPromises);
      
      // Log results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          console.log(`✅ Processing started for source ${sources[index].id}`);
        } else {
          console.error(`❌ Failed to start processing for source ${sources[index].id}:`, result.reason);
        }
      });

      // Start monitoring progress
      setTimeout(calculateProgress, 2000);

    } catch (error) {
      console.error('Failed to start chunk processing:', error);
      throw error;
    }
  };

  return {
    progress,
    isConnected,
    startChunkProcessing,
    refreshProgress: calculateProgress,
    recoverFromStuckState
  };
};
