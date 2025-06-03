
import { MultiProviderLLMService, LLMRequest } from './multiProviderLLMService';
import { supabase } from '@/integrations/supabase/client';

interface LLMConfig {
  model?: string;
  temperature?: number;
  systemPrompt?: string;
}

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

      return await this.processQueryWithConfig(agentId, userQuery, context, {
        model: agent.ai_model,
        temperature: agent.ai_temperature,
        systemPrompt: agent.ai_instructions
      });
    } catch (error) {
      console.error('Error in RAG LLM Integration:', error);
      throw new Error('Failed to process query with configured AI model');
    }
  }

  static async processQueryWithConfig(
    agentId: string,
    userQuery: string,
    context: string[],
    config: LLMConfig
  ): Promise<string> {
    try {
      console.log('🤖 Processing query with specific model configuration:', {
        model: config.model,
        temperature: config.temperature,
        hasSystemPrompt: !!config.systemPrompt,
        contextChunks: context.length
      });

      // Prepare the context string
      const contextString = context.length > 0
        ? `Context information:\n${context.join('\n\n')}\n\n`
        : '';

      // Build the messages array with agent's instructions
      const messages = [
        {
          role: 'system' as const,
          content: config.systemPrompt || 'You are a helpful AI assistant. Use the provided context to answer questions accurately.'
        },
        {
          role: 'user' as const,
          content: `${contextString}User question: ${userQuery}`
        }
      ];

      // Create LLM request with agent's configuration
      const request: LLMRequest = {
        model: config.model || 'gpt-4o-mini',
        messages,
        temperature: config.temperature || 0.7,
        max_tokens: 1000
      };

      console.log('📡 Calling LLM with configuration:', {
        model: request.model,
        temperature: request.temperature,
        messageCount: request.messages.length
      });

      // Call the appropriate LLM provider
      const response = await MultiProviderLLMService.callLLM(request);

      console.log('✅ LLM response received:', {
        model: request.model,
        responseLength: response.content.length,
        tokensUsed: response.usage?.total_tokens || 0
      });

      return response.content;
    } catch (error) {
      console.error('❌ Error in processQueryWithConfig:', error);
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
