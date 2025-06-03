
import { supabase } from '@/integrations/supabase/client';

export interface LLMRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class MultiProviderLLMService {
  static async callLLM(request: LLMRequest): Promise<LLMResponse> {
    try {
      // Determine provider from model name
      const provider = this.getProviderFromModel(request.model);
      
      // Call the appropriate edge function based on provider
      const { data, error } = await supabase.functions.invoke(`llm-${provider}`, {
        body: request
      });

      if (error) {
        console.error(`Error calling ${provider} LLM:`, error);
        throw new Error(`LLM API error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in MultiProviderLLMService:', error);
      throw error;
    }
  }

  static getProviderFromModel(model: string): string {
    if (model.startsWith('gpt-')) return 'openai';
    if (model.startsWith('claude-')) return 'anthropic';
    if (model.startsWith('gemini-')) return 'google';
    
    // Default to OpenAI
    return 'openai';
  }

  static getSupportedModels() {
    return [
      { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
      { value: "gpt-4o", label: "GPT-4o", provider: "OpenAI" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo", provider: "OpenAI" },
      { value: "claude-3-haiku", label: "Claude 3 Haiku", provider: "Anthropic" },
      { value: "claude-3-sonnet", label: "Claude 3 Sonnet", provider: "Anthropic" },
      { value: "claude-3-opus", label: "Claude 3 Opus", provider: "Anthropic" },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash", provider: "Google" },
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro", provider: "Google" }
    ];
  }
}
