
import { RAGOrchestrator, RAGRequest, RAGResponse } from '../../ragOrchestrator';
import { AdvancedQueryPreprocessor } from '../../queryProcessing/advancedQueryPreprocessor';
import { ChatRAGOptions, ChatRAGResult } from '../ragChatIntegration';

export class RAGChatProcessor {
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
}
