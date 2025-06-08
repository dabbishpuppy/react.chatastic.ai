import { LLMProvider } from "@/types";
import { UsageTracker } from '../costMonitoring/usageTracker';

interface LLMService {
  call(prompt: string, options?: any): Promise<any>;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: {
      type: string;
      text: string;
  }[];
  model: string;
  stop_reason: string;
  stop_sequence: null;
  usage: {
      input_tokens: number;
      output_tokens: number;
  };
}

export class MultiProviderLLMService {
  async callOpenAI(prompt: string, options: any = {}): Promise<any> {
    try {
      const model = options.model || 'gpt-4o-mini';

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1000,
        }),
      });

      const data = await response.json();

      // Track usage for OpenAI calls
      if (data.usage && options.agentId) {
        try {
          await UsageTracker.trackTokenUsage({
            teamId: options.teamId || 'default-team',
            agentId: options.agentId,
            provider: 'openai',
            model: options.model || 'gpt-4o-mini',
            inputTokens: data.usage.prompt_tokens || 0,
            outputTokens: data.usage.completion_tokens || 0
          });
        } catch (error) {
          console.error('❌ Failed to track OpenAI usage:', error);
        }
      }

      return {
        content: data.choices[0]?.message?.content || '',
        usage: data.usage,
        provider: 'openai',
        model: options.model || 'gpt-4o-mini'
      };

    } catch (error) {
      console.error('❌ OpenAI API call failed:', error);
      throw error;
    }
  }

  async callClaude(prompt: string, options: any = {}): Promise<any> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: options.model || 'claude-3-5-sonnet-20241022',
          max_tokens: options.maxTokens || 1000,
          messages: [{ role: 'user', content: prompt }],
          temperature: options.temperature || 0.7,
        }),
      });

      const data = await response.json();

      // Track usage for Claude calls
      if (data.usage && options.agentId) {
        try {
          await UsageTracker.trackTokenUsage({
            teamId: options.teamId || 'default-team',
            agentId: options.agentId,
            provider: 'claude',
            model: options.model || 'claude-3-5-sonnet-20241022',
            inputTokens: data.usage.input_tokens || 0,
            outputTokens: data.usage.output_tokens || 0
          });
        } catch (error) {
          console.error('❌ Failed to track Claude usage:', error);
        }
      }

      return {
        content: data.content[0]?.text || '',
        usage: data.usage,
        provider: 'claude',
        model: options.model || 'claude-3-5-sonnet-20241022'
      };

    } catch (error) {
      console.error('❌ Anthropic API call failed:', error);
      throw error;
    }
  }

  async callGemini(prompt: string, options: any = {}): Promise<any> {
    try {
      // Gemini API call implementation
      console.warn('⚠️ Gemini API is not implemented yet');
      return { content: 'Gemini API is not implemented yet', provider: 'gemini' };
    } catch (error) {
      console.error('❌ Gemini API call failed:', error);
      throw error;
    }
  }
}
