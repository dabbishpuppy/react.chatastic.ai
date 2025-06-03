
import { supabase } from "@/integrations/supabase/client";

export class MissingChunksService {
  static async generateMissingChunks(): Promise<{
    success: boolean;
    processedCount: number;
    chunksCreated: number;
    embeddingsGenerated: number;
    message: string;
  }> {
    console.log('🔄 Generating missing chunks and embeddings...');

    try {
      const { data, error } = await supabase.functions.invoke('generate-missing-chunks');

      if (error) {
        console.error('❌ Missing chunks generation error:', error);
        throw new Error(`Failed to generate missing chunks: ${error.message}`);
      }

      if (!data?.success) {
        const errorMessage = data?.error || 'Unknown error occurred';
        console.error('❌ Missing chunks generation failed:', errorMessage);
        throw new Error(`Missing chunks generation failed: ${errorMessage}`);
      }

      const { processedCount, chunksCreated, embeddingsGenerated } = data;
      
      console.log(`✅ Generated missing chunks: ${chunksCreated} chunks, ${embeddingsGenerated} embeddings`);

      return {
        success: true,
        processedCount: processedCount || 0,
        chunksCreated: chunksCreated || 0,
        embeddingsGenerated: embeddingsGenerated || 0,
        message: `Generated ${chunksCreated || 0} chunks and ${embeddingsGenerated || 0} embeddings`
      };

    } catch (error) {
      console.error(`❌ Failed to generate missing chunks:`, error);
      throw error;
    }
  }

  static async generateEmbeddingsForSource(sourceId: string): Promise<{
    success: boolean;
    processedCount: number;
    errorCount: number;
    totalChunks: number;
  }> {
    console.log(`🤖 Generating embeddings for source: ${sourceId}`);

    try {
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: { sourceId }
      });

      if (error) {
        console.error('❌ Embedding generation error:', error);
        throw new Error(`Failed to generate embeddings: ${error.message}`);
      }

      if (!data?.success) {
        const errorMessage = data?.error || 'Unknown error occurred';
        console.error('❌ Embedding generation failed:', errorMessage);
        throw new Error(`Embedding generation failed: ${errorMessage}`);
      }

      const { processedCount, errorCount, totalChunks } = data;
      
      console.log(`✅ Generated embeddings for source: ${sourceId} (${processedCount}/${totalChunks} successful)`);

      return {
        success: true,
        processedCount: processedCount || 0,
        errorCount: errorCount || 0,
        totalChunks: totalChunks || 0
      };

    } catch (error) {
      console.error(`❌ Failed to generate embeddings for source ${sourceId}:`, error);
      throw error;
    }
  }

  static async checkMissingEmbeddings(agentId: string): Promise<{
    chunksWithoutEmbeddings: number;
    totalChunks: number;
    missingPercentage: number;
  }> {
    try {
      // Get total chunks for the agent
      const { data: totalChunks, error: totalError } = await supabase
        .from('source_chunks')
        .select('id', { count: 'exact' })
        .in('source_id', 
          supabase
            .from('agent_sources')
            .select('id')
            .eq('agent_id', agentId)
        );

      if (totalError) {
        console.error('Error fetching total chunks:', totalError);
        return { chunksWithoutEmbeddings: 0, totalChunks: 0, missingPercentage: 0 };
      }

      // Get chunks without embeddings
      const { data: chunksWithoutEmbeddings, error: missingError } = await supabase
        .from('source_chunks')
        .select('id', { count: 'exact' })
        .in('source_id', 
          supabase
            .from('agent_sources')
            .select('id')
            .eq('agent_id', agentId)
        )
        .is('source_embeddings.id', null);

      if (missingError) {
        console.error('Error fetching chunks without embeddings:', missingError);
        return { chunksWithoutEmbeddings: 0, totalChunks: totalChunks?.length || 0, missingPercentage: 0 };
      }

      const totalCount = totalChunks?.length || 0;
      const missingCount = chunksWithoutEmbeddings?.length || 0;
      const missingPercentage = totalCount > 0 ? (missingCount / totalCount) * 100 : 0;

      return {
        chunksWithoutEmbeddings: missingCount,
        totalChunks: totalCount,
        missingPercentage: Math.round(missingPercentage * 100) / 100
      };

    } catch (error) {
      console.error('Error checking missing embeddings:', error);
      return { chunksWithoutEmbeddings: 0, totalChunks: 0, missingPercentage: 0 };
    }
  }
}
