
import { supabase } from "@/integrations/supabase/client";

export class EmbeddingGenerator {
  static async generateEmbeddings(sourceId: string): Promise<void> {
    console.log(`🤖 Generating embeddings for source: ${sourceId}`);

    try {
      // Call the Edge Function to generate embeddings
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: { sourceId }
      });

      if (error) {
        console.error('❌ Edge Function error:', error);
        throw new Error(`Failed to generate embeddings: ${error.message}`);
      }

      if (!data?.success) {
        const errorMessage = data?.error || 'Unknown error occurred';
        console.error('❌ Embedding generation failed:', errorMessage);
        throw new Error(`Embedding generation failed: ${errorMessage}`);
      }

      const { processedCount, errorCount, totalChunks } = data;
      
      if (errorCount > 0) {
        console.warn(`⚠️ Generated embeddings with ${errorCount} errors out of ${totalChunks} chunks`);
      }

      console.log(`✅ Generated embeddings for source: ${sourceId} (${processedCount}/${totalChunks} successful)`);

    } catch (error) {
      console.error(`❌ Failed to generate embeddings for source ${sourceId}:`, error);
      throw error;
    }
  }
}
