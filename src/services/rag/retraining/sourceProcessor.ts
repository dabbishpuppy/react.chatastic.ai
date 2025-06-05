import { supabase } from "@/integrations/supabase/client";
import { DatabaseSource } from '../types/retrainingTypes';

export class SourceProcessor {
  static async processSource(source: DatabaseSource): Promise<void> {
    try {
      console.log(`🔄 Processing source: ${source.title} (${source.source_type})`);

      // Handle website sources with crawled pages
      if (source.source_type === 'website') {
        // Check if this source has unprocessed crawled pages
        const { data: unprocessedPages, error: pagesError } = await supabase
          .from('source_pages')
          .select('id, url, status, processing_status')
          .eq('parent_source_id', source.id)
          .eq('status', 'completed')
          .in('processing_status', ['pending', null]);

        if (pagesError) {
          throw new Error(`Failed to check crawled pages: ${pagesError.message}`);
        }

        if (unprocessedPages && unprocessedPages.length > 0) {
          console.log(`📄 Processing ${unprocessedPages.length} crawled pages for ${source.title}`);
          
          // Process each page individually with improved error handling
          let processedCount = 0;
          let totalChunks = 0;
          
          for (const page of unprocessedPages) {
            try {
              console.log(`🔧 Processing page: ${page.url} (ID: ${page.id})`);
              
              // Mark as processing to prevent conflicts
              const { error: lockError } = await supabase
                .from('source_pages')
                .update({ 
                  processing_status: 'processing',
                  updated_at: new Date().toISOString()
                })
                .eq('id', page.id)
                .eq('processing_status', null); // Only update if not already processing

              if (lockError) {
                console.log(`⚠️ Page ${page.id} already being processed, skipping`);
                continue;
              }

              // Call process-page-content for this specific page
              const { data: processingResult, error: processingError } = await supabase.functions.invoke('process-page-content', {
                body: { pageId: page.id }
              });

              if (processingError) {
                // Handle 409 conflicts gracefully
                if (processingError.message?.includes('409') || processingError.status === 409) {
                  console.log(`✅ Page ${page.id} already processed or processing - marking as completed`);
                  
                  await supabase
                    .from('source_pages')
                    .update({ 
                      processing_status: 'processed',
                      chunks_created: 0 // Unknown, but processed
                    })
                    .eq('id', page.id);
                  
                  processedCount++;
                  continue;
                }

                console.error(`❌ Failed to process page ${page.id}:`, processingError);
                
                // Mark as failed with retry capability
                await supabase
                  .from('source_pages')
                  .update({ 
                    processing_status: 'failed',
                    error_message: processingError.message,
                    retry_count: supabase.sql`COALESCE(retry_count, 0) + 1`
                  })
                  .eq('id', page.id);
                
                continue;
              }

              // Mark as processed successfully
              await supabase
                .from('source_pages')
                .update({ 
                  processing_status: 'processed',
                  chunks_created: processingResult?.chunksCreated || 0
                })
                .eq('id', page.id);

              processedCount++;
              totalChunks += processingResult?.chunksCreated || 0;
              console.log(`✅ Processed page ${page.id} - created ${processingResult?.chunksCreated || 0} chunks`);

            } catch (error) {
              console.error(`❌ Error processing page ${page.id}:`, error);
              
              // Mark as failed with retry capability
              await supabase
                .from('source_pages')
                .update({ 
                  processing_status: 'failed',
                  error_message: error.message,
                  retry_count: supabase.sql`COALESCE(retry_count, 0) + 1`
                })
                .eq('id', page.id);
            }

            // Add small delay to prevent overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Update parent source metadata after processing all pages
          await supabase
            .from('agent_sources')
            .update({ 
              requires_manual_training: false,
              metadata: {
                last_training_at: new Date().toISOString(),
                pages_processed: processedCount,
                total_chunks_created: totalChunks,
                processing_method: 'enhanced_page_processing'
              }
            })
            .eq('id', source.id);

          console.log(`✅ Completed processing ${source.title}: ${processedCount}/${unprocessedPages.length} pages, created ${totalChunks} total chunks`);
          return;
        } else {
          console.log(`⚠️ Website source ${source.title} has no crawled pages to process`);
          return;
        }
      }

      // Handle other source types (text, file, qa) - keep existing code
      if (!source.content || source.content.trim().length === 0) {
        // Check for Q&A sources with structured content
        if (source.source_type === 'qa') {
          const metadata = source.metadata as any;
          if (!metadata?.question || !metadata?.answer) {
            throw new Error('Q&A source missing question or answer content');
          }
          // Process Q&A content
          const qaContent = `Question: ${metadata.question}\nAnswer: ${metadata.answer}`;
          await this.processTextContent(source.id, qaContent, source.source_type);
          return;
        }
        
        throw new Error('Source has no content to process');
      }

      // Process text content for other source types
      await this.processTextContent(source.id, source.content, source.source_type);

    } catch (error) {
      console.error(`❌ Failed to process source ${source.title}:`, error);
      
      // Update source metadata to reflect processing failure
      await supabase
        .from('agent_sources')
        .update({
          metadata: {
            ...(source.metadata || {}),
            processing_status: 'failed',
            last_processing_attempt: new Date().toISOString(),
            processing_error: error instanceof Error ? error.message : 'Unknown error'
          }
        })
        .eq('id', source.id);
      
      throw error;
    }
  }

  private static async processTextContent(sourceId: string, content: string, sourceType: string): Promise<void> {
    try {
      console.log(`🔄 Processing text content for source ${sourceId} (${sourceType})`);

      // Mark as processing first
      const currentMetadata = await this.getSourceMetadata(sourceId);
      await supabase
        .from('agent_sources')
        .update({
          metadata: {
            ...currentMetadata,
            processing_status: 'processing',
            training_started_at: new Date().toISOString()
          }
        })
        .eq('id', sourceId);

      // First, create chunks for the content
      console.log(`🔧 Generating chunks for source ${sourceId}...`);
      const { data: chunkData, error: chunkError } = await supabase.functions.invoke('generate-chunks', {
        body: { 
          sourceId,
          content,
          sourceType 
        }
      });

      if (chunkError) {
        console.error(`❌ Failed to generate chunks for source ${sourceId}:`, chunkError);
        
        // If chunk generation function doesn't exist, create chunks manually
        if (chunkError.message?.includes('Function not found') || chunkError.message?.includes('404')) {
          console.log(`🔧 Creating chunks manually for source ${sourceId}`);
          await this.createChunksManually(sourceId, content, sourceType);
        } else {
          throw new Error(`Failed to generate chunks: ${chunkError.message}`);
        }
      } else {
        console.log(`✅ Generated chunks for source ${sourceId}:`, chunkData);
      }

      // Then generate embeddings for the chunks
      console.log(`🤖 Generating embeddings for source ${sourceId}...`);
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embeddings', {
        body: { sourceId }
      });

      if (embeddingError) {
        console.error(`❌ Failed to generate embeddings for source ${sourceId}:`, embeddingError);
        throw new Error(`Failed to generate embeddings: ${embeddingError.message}`);
      }

      console.log(`✅ Generated embeddings for source ${sourceId}:`, embeddingData);

      // Update source metadata to reflect successful processing
      await supabase
        .from('agent_sources')
        .update({
          metadata: {
            ...currentMetadata,
            processing_status: 'completed',
            last_processed_at: new Date().toISOString(),
            chunks_generated: chunkData?.chunksCreated || embeddingData?.processedCount || 0,
            embeddings_generated: embeddingData?.processedCount || 0
          }
        })
        .eq('id', sourceId);

      console.log(`✅ Successfully processed text content for source ${sourceId}`);

    } catch (error) {
      console.error(`❌ Error processing text content for source ${sourceId}:`, error);
      throw error;
    }
  }

  private static async createChunksManually(sourceId: string, content: string, sourceType: string): Promise<void> {
    try {
      // Simple chunking: split content into chunks of ~1000 characters
      const chunkSize = 1000;
      const chunks = [];
      
      for (let i = 0; i < content.length; i += chunkSize) {
        const chunk = content.slice(i, i + chunkSize);
        if (chunk.trim().length > 0) {
          chunks.push({
            source_id: sourceId,
            chunk_index: chunks.length,
            content: chunk.trim(),
            token_count: Math.ceil(chunk.length / 4), // Rough estimate: 4 chars per token
            metadata: {
              source_type: sourceType,
              chunk_method: 'manual_split',
              created_at: new Date().toISOString()
            }
          });
        }
      }

      // Insert chunks into database
      if (chunks.length > 0) {
        const { error: insertError } = await supabase
          .from('source_chunks')
          .insert(chunks);

        if (insertError) {
          throw new Error(`Failed to insert chunks: ${insertError.message}`);
        }

        console.log(`✅ Manually created ${chunks.length} chunks for source ${sourceId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create chunks manually for source ${sourceId}:`, error);
      throw error;
    }
  }

  private static async getSourceMetadata(sourceId: string): Promise<any> {
    const { data: source } = await supabase
      .from('agent_sources')
      .select('metadata')
      .eq('id', sourceId)
      .single();
    
    return source?.metadata || {};
  }
}
