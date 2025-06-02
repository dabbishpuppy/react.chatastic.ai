import { RAGOrchestrator, RAGRequest } from '../../ragOrchestrator';
import { ChatRAGOptions, ChatRAGResult } from '../ragChatIntegration';
import { RAGChatProcessor } from './ragChatProcessor';

export class RAGStreamingProcessor {
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
          searchFilters: {
            maxResults: options.maxSources || 5,
            minSimilarity: 0.3
          },
          rankingOptions: {
            maxChunks: 5,
            maxTokens: 2000,
            diversityWeight: 0.3,
            recencyWeight: 0.2
          },
          llmOptions: {
            temperature: 0.5,
            systemPrompt: options.customSystemPrompt
          },
          postProcessing: {
            addSourceCitations: true,
            formatMarkdown: true,
            enforceContentSafety: true
          }
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

  private static formatSources(ragResponse: any): ChatRAGResult['sources'] {
    return ragResponse.queryResult.rankedContext.chunks.map((chunk: any) => ({
      id: chunk.chunkId,
      name: chunk.metadata.sourceName,
      type: chunk.metadata.sourceType,
      relevance: Math.round(chunk.relevanceScore * 100) / 100
    }));
  }
}
