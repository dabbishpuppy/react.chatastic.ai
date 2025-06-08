
export type LLMProvider = 'openai' | 'claude' | 'gemini';

export interface LLMRequest {
  query: string;
  context?: string;
  agentId: string;
  conversationId?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  model?: string;
  provider?: LLMProvider;
}

export interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  tokensUsed: number;
  cost: number;
  responseTime: number;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
  sources?: Array<{
    sourceId: string;
    sourceName: string;
    chunkIndex?: number;
  }>;
}

export interface OpenAIParams {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  agentId?: string;
  teamId?: string;
}

export interface ClaudeParams {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  agentId?: string;
  teamId?: string;
}

export interface RAGQueryOptions {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  teamId?: string;
  trackUsage?: boolean;
  searchFilters?: {
    maxResults?: number;
    minSimilarity?: number;
    sourceTypes?: string[];
  };
  rankingOptions?: {
    maxChunks?: number;
    maxTokens?: number;
    diversityWeight?: number;
    recencyWeight?: number;
  };
  llmOptions?: {
    temperature?: number;
    systemPrompt?: string;
    maxTokens?: number;
    model?: string;
  };
  streaming?: boolean;
  postProcessing?: {
    addSourceCitations?: boolean;
    formatMarkdown?: boolean;
    enforceContentSafety?: boolean;
  };
}

export interface RAGQueryResult {
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
  metadata?: any;
  processingTime?: number;
  query?: string;
  context?: string;
}
