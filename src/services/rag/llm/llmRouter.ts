import { MultiProviderLLMService } from './multiProviderLLMService';
import { ClaudeParams, OpenAIParams } from './llmTypes';
import { UsageTracker } from '../costMonitoring/usageTracker';

export interface LLMResult {
  content: string;
  provider: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
  model?: string;
}

export interface LLMRouterParams {
  multiProviderService: MultiProviderLLMService;
}

export class LLMRouter {
  private multiProviderService: MultiProviderLLMService;

  constructor(params: LLMRouterParams) {
    this.multiProviderService = params.multiProviderService;
  }

  private buildPrompt(query: string, context: string): string {
    return `Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.

    ${context}

    Question: ${query}
    `;
  }

  async processQuery(query: string, context: string, options: any = {}): Promise<any> {
    try {
      const selectedProvider = options.provider || 'openai';

      let result;
      
      switch (selectedProvider) {
        case 'openai':
          result = await this.multiProviderService.callOpenAI(
            this.buildPrompt(query, context),
            { ...options, agentId: options.agentId, teamId: options.teamId }
          );
          break;
        case 'claude':
          result = await this.multiProviderService.callClaude(
            this.buildPrompt(query, context),
            { ...options, agentId: options.agentId, teamId: options.teamId }
          );
          break;
        case 'gemini':
          result = await this.multiProviderService.callGemini(
            this.buildPrompt(query, context),
            { ...options, agentId: options.agentId, teamId: options.teamId }
          );
          break;
        default:
          throw new Error(`Unknown provider: ${selectedProvider}`);
      }

      // Ensure usage tracking is enabled at router level
      if (result.usage && options.trackUsage && options.agentId) {
        try {
          await UsageTracker.trackTokenUsage({
            teamId: options.teamId || 'default-team',
            agentId: options.agentId,
            provider: selectedProvider,
            model: result.model || options.model || 'gpt-4o-mini',
            inputTokens: result.usage.prompt_tokens || result.usage.input_tokens || 0,
            outputTokens: result.usage.completion_tokens || result.usage.output_tokens || 0
          });
        } catch (error) {
          console.error('❌ Failed to track usage at router level:', error);
        }
      }

      return result;

    } catch (error) {
      console.error('❌ LLM Router Error:', error);
      throw error;
    }
  }
}
