
import { supabase } from "@/integrations/supabase/client";

export interface EmbeddingProvider {
  name: 'openai' | 'claude' | 'gemini' | 'cohere';
  model: string;
  dimensions: number;
  maxTokens: number;
  costPerToken: number;
}

export interface EmbeddingRequest {
  texts: string[];
  provider?: 'openai' | 'claude' | 'gemini' | 'cohere';
  model?: string;
  agentId?: string;
  teamId?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  provider: string;
  model: string;
  tokensUsed: number;
  cost: number;
  processingTime: number;
}

export class MultiLLMEmbeddingRouter {
  private static readonly PROVIDERS: Record<string, EmbeddingProvider> = {
    'openai-small': {
      name: 'openai',
      model: 'text-embedding-3-small',
      dimensions: 1536,
      maxTokens: 8191,
      costPerToken: 0.00002
    },
    'openai-large': {
      name: 'openai',
      model: 'text-embedding-3-large',
      dimensions: 3072,
      maxTokens: 8191,
      costPerToken: 0.00013
    },
    'cohere-english': {
      name: 'cohere',
      model: 'embed-english-v3.0',
      dimensions: 1024,
      maxTokens: 512,
      costPerToken: 0.0001
    },
    'cohere-multilingual': {
      name: 'cohere',
      model: 'embed-multilingual-v3.0',
      dimensions: 1024,
      maxTokens: 512,
      costPerToken: 0.0001
    }
  };

  // Route embedding request to appropriate provider
  static async generateEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    console.log(`🤖 Generating embeddings for ${request.texts.length} texts`);
    
    const startTime = Date.now();
    
    // Determine provider and model
    const providerConfig = await this.selectProvider(request);
    console.log(`Using provider: ${providerConfig.name} (${providerConfig.model})`);

    // Validate text length
    for (const text of request.texts) {
      if (this.estimateTokens(text) > providerConfig.maxTokens) {
        throw new Error(`Text exceeds maximum tokens for ${providerConfig.model}`);
      }
    }

    // Generate embeddings based on provider
    let embeddings: number[][];
    let tokensUsed: number;

    switch (providerConfig.name) {
      case 'openai':
        ({ embeddings, tokensUsed } = await this.generateOpenAIEmbeddings(request.texts, providerConfig));
        break;
      case 'cohere':
        ({ embeddings, tokensUsed } = await this.generateCohereEmbeddings(request.texts, providerConfig));
        break;
      default:
        throw new Error(`Provider ${providerConfig.name} not implemented`);
    }

    const processingTime = Date.now() - startTime;
    const cost = tokensUsed * providerConfig.costPerToken;

    // Track usage
    if (request.teamId) {
      await this.trackEmbeddingUsage({
        teamId: request.teamId,
        agentId: request.agentId,
        provider: providerConfig.name,
        model: providerConfig.model,
        tokensUsed,
        cost,
        processingTime
      });
    }

    console.log(`✅ Generated ${embeddings.length} embeddings in ${processingTime}ms`);

    return {
      embeddings,
      provider: providerConfig.name,
      model: providerConfig.model,
      tokensUsed,
      cost,
      processingTime
    };
  }

  // Select optimal provider based on request and configuration
  private static async selectProvider(request: EmbeddingRequest): Promise<EmbeddingProvider> {
    // If specific provider requested, use it
    if (request.provider && request.model) {
      const configKey = `${request.provider}-${request.model.split('-').pop()}`;
      const provider = this.PROVIDERS[configKey];
      if (provider) return provider;
    }

    // Get agent/team configuration
    if (request.agentId) {
      const { data: agent } = await supabase
        .from('agents')
        .select('team_id')
        .eq('id', request.agentId)
        .single();

      if (agent?.team_id) {
        const teamConfig = await this.getTeamEmbeddingConfig(agent.team_id);
        if (teamConfig) {
          const provider = this.PROVIDERS[teamConfig];
          if (provider) return provider;
        }
      }
    }

    // Default to OpenAI small model
    return this.PROVIDERS['openai-small'];
  }

  // Generate embeddings using OpenAI
  private static async generateOpenAIEmbeddings(
    texts: string[], 
    provider: EmbeddingProvider
  ): Promise<{ embeddings: number[][]; tokensUsed: number }> {
    const { data, error } = await supabase.functions.invoke('generate-embeddings', {
      body: {
        provider: 'openai',
        model: provider.model,
        texts,
        dimensions: provider.dimensions
      }
    });

    if (error) {
      throw new Error(`OpenAI embedding failed: ${error.message}`);
    }

    return {
      embeddings: data.embeddings,
      tokensUsed: data.tokensUsed || this.estimateTokensForTexts(texts)
    };
  }

  // Generate embeddings using Cohere
  private static async generateCohereEmbeddings(
    texts: string[], 
    provider: EmbeddingProvider
  ): Promise<{ embeddings: number[][]; tokensUsed: number }> {
    const { data, error } = await supabase.functions.invoke('generate-embeddings', {
      body: {
        provider: 'cohere',
        model: provider.model,
        texts,
        inputType: 'search_document'
      }
    });

    if (error) {
      throw new Error(`Cohere embedding failed: ${error.message}`);
    }

    return {
      embeddings: data.embeddings,
      tokensUsed: data.tokensUsed || this.estimateTokensForTexts(texts)
    };
  }

  // Get team embedding configuration
  private static async getTeamEmbeddingConfig(teamId: string): Promise<string | null> {
    const { data: team } = await supabase
      .from('teams')
      .select('metadata')
      .eq('id', teamId)
      .single();

    return team?.metadata?.embedding_provider || null;
  }

  // Track embedding usage for billing and analytics
  private static async trackEmbeddingUsage(usage: {
    teamId: string;
    agentId?: string;
    provider: string;
    model: string;
    tokensUsed: number;
    cost: number;
    processingTime: number;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('crawl_performance_metrics')
        .insert({
          team_id: usage.teamId,
          agent_id: usage.agentId,
          phase: 'embedding_generation',
          start_time: new Date().toISOString(),
          duration_ms: usage.processingTime,
          items_processed: 1,
          metadata: {
            provider: usage.provider,
            model: usage.model,
            tokens_used: usage.tokensUsed,
            cost: usage.cost
          }
        });

      if (error) {
        console.error('Failed to track embedding usage:', error);
      }
    } catch (error) {
      console.error('Error tracking embedding usage:', error);
    }
  }

  // Estimate tokens for a text
  private static estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  // Estimate total tokens for multiple texts
  private static estimateTokensForTexts(texts: string[]): number {
    return texts.reduce((total, text) => total + this.estimateTokens(text), 0);
  }

  // Batch processing for large datasets
  static async generateEmbeddingsBatch(
    texts: string[],
    batchSize: number = 100,
    request: Omit<EmbeddingRequest, 'texts'> = {}
  ): Promise<EmbeddingResponse[]> {
    console.log(`📊 Processing ${texts.length} texts in batches of ${batchSize}`);

    const results: EmbeddingResponse[] = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);
      
      const batchResult = await this.generateEmbeddings({
        ...request,
        texts: batch
      });
      
      results.push(batchResult);
    }

    return results;
  }

  // Get available providers and their capabilities
  static getAvailableProviders(): EmbeddingProvider[] {
    return Object.values(this.PROVIDERS);
  }

  // Calculate cost estimate for texts
  static estimateCost(texts: string[], providerKey: string = 'openai-small'): {
    estimatedTokens: number;
    estimatedCost: number;
    provider: EmbeddingProvider;
  } {
    const provider = this.PROVIDERS[providerKey];
    if (!provider) {
      throw new Error(`Provider ${providerKey} not found`);
    }

    const estimatedTokens = this.estimateTokensForTexts(texts);
    const estimatedCost = estimatedTokens * provider.costPerToken;

    return {
      estimatedTokens,
      estimatedCost,
      provider
    };
  }
}
