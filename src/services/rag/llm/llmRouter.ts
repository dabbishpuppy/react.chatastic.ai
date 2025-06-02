
import { RAGQueryResult } from '../queryProcessing/ragQueryEngine';

export interface LLMProvider {
  name: 'openai' | 'claude' | 'gemini';
  model: string;
  costPerToken: number;
  maxTokens: number;
  supportsStreaming: boolean;
}

export interface LLMRequest {
  query: string;
  context: string;
  agentId: string;
  conversationId?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  tokensUsed: number;
  cost: number;
  responseTime: number;
  sources?: Array<{
    sourceId: string;
    sourceName: string;
    chunkIndex: number;
  }>;
}

export class LLMRouter {
  private static readonly PROVIDERS: Record<string, LLMProvider> = {
    'gpt-4o-mini': {
      name: 'openai',
      model: 'gpt-4o-mini',
      costPerToken: 0.00015 / 1000, // $0.15 per 1M tokens
      maxTokens: 128000,
      supportsStreaming: true
    },
    'gpt-4o': {
      name: 'openai',
      model: 'gpt-4o',
      costPerToken: 0.005 / 1000, // $5 per 1M tokens
      maxTokens: 128000,
      supportsStreaming: true
    },
    'claude-3-haiku': {
      name: 'claude',
      model: 'claude-3-haiku-20240307',
      costPerToken: 0.00025 / 1000, // $0.25 per 1M tokens
      maxTokens: 200000,
      supportsStreaming: true
    },
    'gemini-1.5-flash': {
      name: 'gemini',
      model: 'gemini-1.5-flash',
      costPerToken: 0.000075 / 1000, // $0.075 per 1M tokens
      maxTokens: 1000000,
      supportsStreaming: true
    }
  };

  static selectOptimalProvider(
    contextLength: number,
    requiresStreaming: boolean = false,
    preferredProvider?: string
  ): LLMProvider {
    console.log('🤖 Selecting optimal LLM provider:', {
      contextLength,
      requiresStreaming,
      preferredProvider
    });

    // If user has a preference, use it if valid
    if (preferredProvider && this.PROVIDERS[preferredProvider]) {
      const provider = this.PROVIDERS[preferredProvider];
      if (!requiresStreaming || provider.supportsStreaming) {
        return provider;
      }
    }

    // Filter providers based on requirements
    const validProviders = Object.values(this.PROVIDERS).filter(provider => {
      const hasCapacity = contextLength <= provider.maxTokens;
      const supportsStreaming = !requiresStreaming || provider.supportsStreaming;
      return hasCapacity && supportsStreaming;
    });

    if (validProviders.length === 0) {
      throw new Error('No suitable LLM provider found for requirements');
    }

    // Sort by cost efficiency (cost per token)
    validProviders.sort((a, b) => a.costPerToken - b.costPerToken);

    const selected = validProviders[0];
    console.log('✅ Selected LLM provider:', {
      name: selected.name,
      model: selected.model,
      costPerToken: selected.costPerToken
    });

    return selected;
  }

  static async generateResponse(
    request: LLMRequest,
    ragResult: RAGQueryResult
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    
    console.log('🚀 Generating LLM response:', {
      query: request.query.substring(0, 50) + '...',
      provider: request.stream ? 'streaming' : 'standard',
      contextChunks: ragResult.rankedContext.chunks.length
    });

    try {
      // Select optimal provider
      const provider = this.selectOptimalProvider(
        ragResult.rankedContext.totalTokens + request.query.length,
        request.stream
      );

      // Build context from ranked chunks
      const contextText = this.buildContextText(ragResult);
      
      // Generate system prompt
      const systemPrompt = this.buildSystemPrompt(request.systemPrompt, contextText);

      // Route to appropriate provider
      let response: LLMResponse;
      
      switch (provider.name) {
        case 'openai':
          response = await this.callOpenAI(request, systemPrompt, provider);
          break;
        case 'claude':
          response = await this.callClaude(request, systemPrompt, provider);
          break;
        case 'gemini':
          response = await this.callGemini(request, systemPrompt, provider);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider.name}`);
      }

      // Add source information
      response.sources = ragResult.rankedContext.chunks.map(chunk => ({
        sourceId: chunk.sourceId,
        sourceName: chunk.metadata.sourceName,
        chunkIndex: chunk.metadata.chunkIndex
      }));

      response.responseTime = Date.now() - startTime;

      console.log('✅ LLM response generated:', {
        provider: response.provider,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        responseTime: response.responseTime,
        sources: response.sources?.length || 0
      });

      return response;
    } catch (error) {
      console.error('❌ LLM response generation failed:', error);
      throw error;
    }
  }

  private static buildContextText(ragResult: RAGQueryResult): string {
    if (ragResult.rankedContext.chunks.length === 0) {
      return 'No relevant context found.';
    }

    return ragResult.rankedContext.chunks
      .map((chunk, index) => `[Source ${index + 1}: ${chunk.metadata.sourceName}]\n${chunk.content}`)
      .join('\n\n');
  }

  private static buildSystemPrompt(customPrompt?: string, context?: string): string {
    const basePrompt = customPrompt || `You are a helpful AI assistant. Use the provided context to answer questions accurately and helpfully. If the context doesn't contain enough information to answer a question, say so clearly.`;
    
    if (!context || context === 'No relevant context found.') {
      return basePrompt;
    }

    return `${basePrompt}

Context Information:
${context}

Instructions:
- Use the context information to provide accurate, helpful answers
- Cite sources when referencing specific information
- If the context doesn't fully answer the question, acknowledge the limitations
- Be concise but thorough in your responses`;
  }

  private static async callOpenAI(
    request: LLMRequest,
    systemPrompt: string,
    provider: LLMProvider
  ): Promise<LLMResponse> {
    // This would be implemented as an edge function call
    // For now, return a placeholder response
    console.log('📞 Calling OpenAI:', provider.model);
    
    return {
      content: `This is a placeholder response using ${provider.model}. The actual implementation would call the OpenAI API through an edge function.`,
      provider: provider.name,
      model: provider.model,
      tokensUsed: 150,
      cost: 150 * provider.costPerToken,
      responseTime: 0
    };
  }

  private static async callClaude(
    request: LLMRequest,
    systemPrompt: string,
    provider: LLMProvider
  ): Promise<LLMResponse> {
    console.log('📞 Calling Claude:', provider.model);
    
    return {
      content: `This is a placeholder response using ${provider.model}. The actual implementation would call the Claude API through an edge function.`,
      provider: provider.name,
      model: provider.model,
      tokensUsed: 140,
      cost: 140 * provider.costPerToken,
      responseTime: 0
    };
  }

  private static async callGemini(
    request: LLMRequest,
    systemPrompt: string,
    provider: LLMProvider
  ): Promise<LLMResponse> {
    console.log('📞 Calling Gemini:', provider.model);
    
    return {
      content: `This is a placeholder response using ${provider.model}. The actual implementation would call the Gemini API through an edge function.`,
      provider: provider.name,
      model: provider.model,
      tokensUsed: 135,
      cost: 135 * provider.costPerToken,
      responseTime: 0
    };
  }
}
