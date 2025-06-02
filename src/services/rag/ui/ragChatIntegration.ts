import { RAGOrchestrator, RAGRequest, RAGResponse } from '../ragOrchestrator';
import { AdvancedQueryPreprocessor } from '../queryProcessing/advancedQueryPreprocessor';

export interface ChatRAGOptions {
  enableRAG?: boolean;
  maxSources?: number;
  enableStreaming?: boolean;
  enableAdvancedFiltering?: boolean;
  customSystemPrompt?: string;
}

export interface ChatRAGResult {
  response: string;
  sources?: Array<{
    id: string;
    name: string;
    type: string;
    relevance: number;
  }>;
  processingMetadata?: {
    totalTime: number;
    ragEnabled: boolean;
    sourcesUsed: number;
  };
}

export class RAGChatIntegration {
  static async processMessageWithRAG(
    message: string,
    agentId: string,
    conversationId?: string,
    options: ChatRAGOptions = {}
  ): Promise<ChatRAGResult> {
    console.log('🤖 Processing message with RAG integration:', {
      message: message.substring(0, 50) + '...',
      agentId,
      ragEnabled: options.enableRAG !== false
    });

    try {
      // If RAG is disabled, return simple response
      if (options.enableRAG === false) {
        return {
          response: 'This is a basic response without RAG integration.',
          processingMetadata: {
            totalTime: 0,
            ragEnabled: false,
            sourcesUsed: 0
          }
        };
      }

      const startTime = Date.now();

      // Perform advanced query analysis using preprocessQueryWithContext
      const advancedAnalysis = await AdvancedQueryPreprocessor.preprocessQueryWithContext(
        message,
        agentId,
        conversationId
      );

      // Build RAG request with advanced options
      const ragRequest: RAGRequest = {
        query: message,
        agentId,
        conversationId,
        options: {
          searchFilters: {
            maxResults: options.maxSources || 5,
            minSimilarity: 0.3,
            sourceTypes: advancedAnalysis.analysis.suggestedFilters.sourceTypes as any
          },
          rankingOptions: {
            maxChunks: this.getMaxChunksForComplexity(advancedAnalysis.analysis.complexityScore),
            maxTokens: this.getMaxTokensForComplexity(advancedAnalysis.analysis.complexityScore),
            diversityWeight: 0.3,
            recencyWeight: 0.2
          },
          llmOptions: {
            temperature: this.getTemperatureForIntent(advancedAnalysis.analysis.intentConfidence),
            systemPrompt: options.customSystemPrompt
          },
          streaming: options.enableStreaming || false,
          postProcessing: {
            addSourceCitations: true,
            formatMarkdown: true,
            enforceContentSafety: true
          }
        }
      };

      // Process with RAG
      const ragResponse = await RAGOrchestrator.processRAGRequest(ragRequest);

      // Format response for chat interface
      const result: ChatRAGResult = {
        response: ragResponse.processedResponse.content,
        sources: this.formatSources(ragResponse),
        processingMetadata: {
          totalTime: Date.now() - startTime,
          ragEnabled: true,
          sourcesUsed: ragResponse.queryResult.rankedContext.sources.length
        }
      };

      console.log('✅ RAG chat integration complete:', {
        totalTime: result.processingMetadata?.totalTime,
        sourcesUsed: result.processingMetadata?.sourcesUsed,
        responseLength: result.response.length
      });

      return result;
    } catch (error) {
      console.error('❌ RAG chat integration failed:', error);
      
      // Return fallback response
      return {
        response: 'I apologize, but I encountered an issue processing your request. Please try again.',
        processingMetadata: {
          totalTime: Date.now() - Date.now(),
          ragEnabled: true,
          sourcesUsed: 0
        }
      };
    }
  }

  static async processStreamingMessageWithRAG(
    message: string,
    agentId: string,
    onChunk: (chunk: string) => void,
    onComplete: (result: ChatRAGResult) => void,
    conversationId?: string,
    options: ChatRAGOptions = {}
  ): Promise<void> {
    console.log('🌊 Starting streaming RAG processing');

    try {
      const ragRequest: RAGRequest = {
        query: message,
        agentId,
        conversationId,
        options: {
          streaming: true,
          streamingOptions: {
            onChunk: (chunk) => {
              if (!chunk.isComplete) {
                onChunk(chunk.delta);
              }
            },
            onComplete: (fullResponse) => {
              // This will be called when streaming is complete
              console.log('🏁 Streaming complete, processing final result');
            }
          },
          // ... other options similar to processMessageWithRAG
        }
      };

      const ragResponse = await RAGOrchestrator.processRAGRequest(ragRequest);
      
      const result: ChatRAGResult = {
        response: ragResponse.processedResponse.content,
        sources: this.formatSources(ragResponse),
        processingMetadata: {
          totalTime: ragResponse.performance.totalTime,
          ragEnabled: true,
          sourcesUsed: ragResponse.queryResult.rankedContext.sources.length
        }
      };

      onComplete(result);
    } catch (error) {
      console.error('❌ Streaming RAG processing failed:', error);
      onComplete({
        response: 'I apologize, but I encountered an issue processing your request.',
        processingMetadata: {
          totalTime: 0,
          ragEnabled: true,
          sourcesUsed: 0
        }
      });
    }
  }

  private static getMaxChunksForComplexity(complexityScore: number): number {
    if (complexityScore < 0.4) return 3;
    if (complexityScore < 0.7) return 5;
    return 8;
  }

  private static getMaxTokensForComplexity(complexityScore: number): number {
    if (complexityScore < 0.4) return 1000;
    if (complexityScore < 0.7) return 2000;
    return 4000;
  }

  private static getTemperatureForIntent(intentConfidence: number): number {
    // Lower temperature for high confidence (more factual queries)
    // Higher temperature for low confidence (more creative queries)
    if (intentConfidence > 0.8) return 0.1;
    if (intentConfidence > 0.6) return 0.3;
    if (intentConfidence > 0.4) return 0.5;
    return 0.7;
  }

  private static formatSources(ragResponse: RAGResponse): ChatRAGResult['sources'] {
    return ragResponse.queryResult.rankedContext.chunks.map(chunk => ({
      id: chunk.chunkId,
      name: chunk.metadata.sourceName,
      type: chunk.metadata.sourceType,
      relevance: Math.round(chunk.relevanceScore * 100) / 100
    }));
  }

  // Utility method for quick RAG responses
  static async quickRAGResponse(
    message: string,
    agentId: string,
    maxSources: number = 3
  ): Promise<string> {
    try {
      const result = await this.processMessageWithRAG(message, agentId, undefined, {
        enableRAG: true,
        maxSources,
        enableStreaming: false,
        enableAdvancedFiltering: true
      });
      
      return result.response;
    } catch (error) {
      console.error('❌ Quick RAG response failed:', error);
      return 'I apologize, but I encountered an issue processing your request.';
    }
  }

  // Method to check if RAG should be enabled for a query
  static shouldEnableRAG(message: string, agentId: string): boolean {
    // Simple heuristics to determine if RAG would be beneficial
    const messageLength = message.length;
    const hasQuestionWords = /\b(what|how|when|where|why|who|which|explain|describe|tell me|show me)\b/i.test(message);
    const isGreeting = /\b(hello|hi|hey|good morning|good afternoon|good evening)\b/i.test(message);
    
    // Enable RAG for substantive questions, disable for simple greetings
    return messageLength > 10 && hasQuestionWords && !isGreeting;
  }
}
