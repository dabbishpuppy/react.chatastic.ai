
import { supabase } from "@/integrations/supabase/client";

export class EmbeddingGenerator {
  static async generateEmbeddings(sourceId: string): Promise<void> {
    console.log(`🤖 Generating embeddings for source: ${sourceId}`);

    // Get chunks for this source
    const { data: chunks, error } = await supabase
      .from('source_chunks')
      .select('*')
      .eq('source_id', sourceId);

    if (error) throw error;

    // Generate embeddings using OpenAI
    for (const chunk of chunks || []) {
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY || 'your-api-key-here'}`
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: chunk.content
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const embedding = data.data[0].embedding;

        // Store embedding
        await supabase
          .from('source_embeddings')
          .upsert({
            chunk_id: chunk.id,
            embedding: JSON.stringify(embedding),
            model: 'text-embedding-3-small'
          });

      } catch (error) {
        console.error(`❌ Failed to generate embedding for chunk ${chunk.id}:`, error);
        // Continue with other chunks even if one fails
      }
    }

    console.log(`✅ Generated embeddings for source: ${sourceId}`);
  }
}
