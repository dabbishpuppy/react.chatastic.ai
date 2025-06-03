
import { MultiProviderLLMService, LLMRequest } from './multiProviderLLMService';
import { supabase } from '@/integrations/supabase/client';

export class RAGLLMIntegrationEnhanced {
  static async processQuery(
    agentId: string,
    userQuery: string,
    context: string[]
  ): Promise<string> {
    try {
      // Get agent's AI configuration
      const { data: agent, error } = await supabase
        .from('agents')
        .select('ai_model, ai_instructions, ai_temperature')
        .eq('id', agentId)
        .single();

      if (error || !agent) {
        throw new Error('Agent configuration not found');
      }

      // Prepare the context string
      const contextString = context.length > 0
        ? `Context information:\n${context.join('\n\n')}\n\n`
        : '';

      // Build the messages array
      const messages = [
        {
          role: 'system' as const,
          content: agent.ai_instructions
        },
        {
          role: 'user' as const,
          content: `${contextString}User question: ${userQuery}`
        }
      ];

      // Create LLM request
      const request: LLMRequest = {
        model: agent.ai_model,
        messages,
        temperature: agent.ai_temperature,
        max_tokens: 1000
      };

      // Call the appropriate LLM provider
      const response = await MultiProviderLLMService.callLLM(request);

      return response.content;
    } catch (error) {
      console.error('Error in RAG LLM Integration:', error);
      throw new Error('Failed to process query with configured AI model');
    }
  }

  static async getAgentConfiguration(agentId: string) {
    const { data, error } = await supabase
      .from('agents')
      .select('ai_model, ai_instructions, ai_temperature, ai_prompt_template')
      .eq('id', agentId)
      .single();

    if (error) {
      throw new Error('Failed to load agent AI configuration');
    }

    return data;
  }
}
