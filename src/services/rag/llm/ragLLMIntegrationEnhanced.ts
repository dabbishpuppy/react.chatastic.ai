
import { LLMRouter } from './llmRouter';
import { RAGQueryOptions, RAGQueryResult } from './llmTypes';
import { UsageTracker } from '../costMonitoring/usageTracker';

export class EnhancedRAGLLMIntegration {
  private llmRouter: LLMRouter;

  constructor(llmRouter: LLMRouter) {
    this.llmRouter = llmRouter;
  }

  async processQuery(
    query: string,
    context: string,
    agentId: string,
    options: RAGQueryOptions = {}
  ): Promise<RAGQueryResult> {
    try {
      const startTime = Date.now();
      
      // Preprocessing and setup
      const cleanedQuery = query.trim().replace(/\n/g, ' ');
      
      const response = await this.llmRouter.processQuery(query, context, {
        ...options,
        agentId,
        trackUsage: true // Enable usage tracking
      });

      // Track token usage after successful LLM call
      if (response.usage) {
        try {
          await UsageTracker.trackTokenUsage({
            teamId: options.teamId || 'default-team',
            agentId: agentId,
            provider: response.provider || 'openai',
            model: response.model || 'gpt-4o-mini',
            inputTokens: response.usage.prompt_tokens || 0,
            outputTokens: response.usage.completion_tokens || 0
          });
        } catch (error) {
          console.error('❌ Failed to track usage:', error);
        }
      }

      // Response processing and return
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      const result: RAGQueryResult = {
        ...response,
        processingTime: processingTime,
        query: cleanedQuery,
        context: context
      };

      return result;

    } catch (error) {
      console.error('❌ Error in EnhancedRAGLLMIntegration.processQuery:', error);
      throw error;
    }
  }

  static async processQueryWithConfig(
    agentId: string,
    query: string,
    contextChunks: string[],
    llmOptions: any = {}
  ): Promise<string> {
    const context = contextChunks.join('\n\n');
    const llmRouter = new LLMRouter({ 
      multiProviderService: new (await import('./multiProviderLLMService')).MultiProviderLLMService() 
    });
    const integration = new EnhancedRAGLLMIntegration(llmRouter);
    
    const result = await integration.processQuery(query, context, agentId, {
      provider: 'openai',
      model: llmOptions.model || 'gpt-4o-mini',
      temperature: llmOptions.temperature || 0.7,
      teamId: 'default-team'
    });
    
    return result.content;
  }
}

// Also export as RAGLLMIntegrationEnhanced for compatibility
export const RAGLLMIntegrationEnhanced = EnhancedRAGLLMIntegration;
