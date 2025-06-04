
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
          .select('id')
          .eq('parent_source_id', source.id)
          .eq('status', 'completed')
          .eq('processing_status', 'pending');

        if (pagesError) {
          throw new Error(`Failed to check crawled pages: ${pagesError.message}`);
        }

        if (unprocessedPages && unprocessedPages.length > 0) {
          console.log(`📄 Processing ${unprocessedPages.length} crawled pages for ${source.title}`);
          
          // Process crawled pages
          const { data, error } = await supabase.functions.invoke('process-crawled-pages', {
            body: { parentSourceId: source.id }
          });

          if (error) {
            throw new Error(`Failed to process crawled pages: ${error.message}`);
          }

          console.log(`✅ Processed crawled pages for ${source.title}:`, data);
          return;
        }
      }

      // Handle other source types (text, file, qa) - existing logic
      if (!source.content || source.content.trim().length === 0) {
        // Check for Q&A sources with structured content
        if (source.source_type === 'qa') {
          const metadata = source.metadata as any;
          if (!metadata?.question || !metadata?.answer) {
            throw new Error('Q&A source missing question or answer content');
          }
          // Process Q&A content
          const qaContent = `Question: ${metadata.question}\nAnswer: ${metadata.answer}`;
          await this.processTextContent(source.id, qaContent);
          return;
        }
        
        throw new Error('Source has no content to process');
      }

      // Process text content for other source types
      await this.processTextContent(source.id, source.content);

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

  private static async processTextContent(sourceId: string, content: string): Promise<void> {
    try {
      // Call the generate embeddings function to process the content
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: { sourceId }
      });

      if (error) {
        throw new Error(`Failed to generate embeddings: ${error.message}`);
      }

      // Update source metadata to reflect successful processing
      await supabase
        .from('agent_sources')
        .update({
          metadata: {
            processing_status: 'completed',
            last_processed_at: new Date().toISOString(),
            chunks_generated: data?.chunksCreated || 0,
            embeddings_generated: data?.embeddingsCreated || 0
          }
        })
        .eq('id', sourceId);

      console.log(`✅ Successfully processed text content for source ${sourceId}`);

    } catch (error) {
      console.error(`❌ Error processing text content for source ${sourceId}:`, error);
      throw error;
    }
  }
}
