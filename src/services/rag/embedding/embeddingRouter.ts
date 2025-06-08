
import { UsageTracker } from '../costMonitoring/usageTracker';

export interface EmbeddingRequest {
  text: string;
  model?: string;
  provider?: 'openai' | 'claude' | 'gemini';
  teamId: string;
  agentId: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  provider: string;
  tokenCount: number;
  cost: number;
}

export class EmbeddingRouter {
  private static readonly DEFAULT_MODELS = {
    openai: 'text-embedding-3-small',
    claude: 'claude-3-5-sonnet-20241022', // Claude doesn't have dedicated embedding models
    gemini: 'text-embedding-004'
  };

  /**
   * Generate embeddings with provider routing
   */
  static async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const provider = request.provider || 'openai';
    const model = request.model || this.DEFAULT_MODELS[provider];

    console.log(`🔤 Generating embedding with ${provider}/${model}`);

    try {
      let embedding: number[];
      let tokenCount: number;

      switch (provider) {
        case 'openai':
          ({ embedding, tokenCount } = await this.generateOpenAIEmbedding(request.text, model));
          break;
        case 'claude':
          // Claude doesn't have embedding API, fall back to OpenAI
          console.warn('⚠️ Claude embedding requested, falling back to OpenAI');
          ({ embedding, tokenCount } = await this.generateOpenAIEmbedding(request.text, this.DEFAULT_MODELS.openai));
          break;
        case 'gemini':
          ({ embedding, tokenCount } = await this.generateGeminiEmbedding(request.text, model));
          break;
        default:
          throw new Error(`Unsupported embedding provider: ${provider}`);
      }

      // Track usage for billing
      await UsageTracker.trackTokenUsage({
        teamId: request.teamId,
        agentId: request.agentId,
        provider,
        model,
        inputTokens: tokenCount,
        outputTokens: 0
      });

      // Calculate cost (simplified)
      const cost = tokenCount * 0.00002; // OpenAI text-embedding-3-small rate

      return {
        embedding,
        model,
        provider,
        tokenCount,
        cost
      };

    } catch (error) {
      console.error(`❌ Failed to generate embedding with ${provider}:`, error);
      throw new Error(`Embedding generation failed: ${error}`);
    }
  }

  private static async generateOpenAIEmbedding(text: string, model: string): Promise<{ embedding: number[]; tokenCount: number }> {
    // This would normally call OpenAI API
    // For now, return mock data
    console.log(`📡 Calling OpenAI API for embedding: ${model}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Mock embedding (1536 dimensions for text-embedding-3-small)
    const embedding = new Array(1536).fill(0).map(() => Math.random() * 2 - 1);
    const tokenCount = Math.ceil(text.length / 4); // Rough token estimation

    return { embedding, tokenCount };
  }

  private static async generateGeminiEmbedding(text: string, model: string): Promise<{ embedding: number[]; tokenCount: number }> {
    // This would normally call Gemini API
    console.log(`📡 Calling Gemini API for embedding: ${model}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 120));
    
    // Mock embedding (768 dimensions for Gemini)
    const embedding = new Array(768).fill(0).map(() => Math.random() * 2 - 1);
    const tokenCount = Math.ceil(text.length / 4);

    return { embedding, tokenCount };
  }

  /**
   * Batch generate embeddings
   */
  static async generateBatchEmbeddings(requests: EmbeddingRequest[]): Promise<EmbeddingResponse[]> {
    console.log(`📦 Generating ${requests.length} embeddings in batch`);
    
    // Process in chunks to avoid rate limits
    const BATCH_SIZE = 100;
    const results: EmbeddingResponse[] = [];

    for (let i = 0; i < requests.length; i += BATCH_SIZE) {
      const batch = requests.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(request => this.generateEmbedding(request));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        console.log(`✅ Completed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(requests.length / BATCH_SIZE)}`);
        
        // Rate limiting delay between batches
        if (i + BATCH_SIZE < requests.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Get optimal provider for embedding task
   */
  static getOptimalProvider(textLength: number, teamPreferences?: any): 'openai' | 'gemini' {
    // Simple routing logic - can be enhanced based on cost, performance, etc.
    if (teamPreferences?.preferredEmbeddingProvider) {
      return teamPreferences.preferredEmbeddingProvider;
    }

    // For longer texts, prefer Gemini (hypothetically better for long context)
    if (textLength > 8000) {
      return 'gemini';
    }

    // Default to OpenAI for general use
    return 'openai';
  }
}
