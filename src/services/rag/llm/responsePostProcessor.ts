
import { LLMResponse } from './llmTypes';

export interface PostProcessingOptions {
  addSourceCitations?: boolean;
  formatMarkdown?: boolean;
  enforceContentSafety?: boolean;
}

export interface ProcessedResponse {
  content: string;
  metadata: {
    model: string;
    temperature: number;
    processingTime: number;
  };
}

export class ResponsePostProcessor {
  static async processResponse(
    response: LLMResponse,
    options?: PostProcessingOptions
  ): Promise<ProcessedResponse> {
    return {
      content: response.content,
      metadata: {
        model: response.model,
        temperature: 0.7,
        processingTime: response.responseTime
      }
    };
  }
}
