
import { RAGOrchestrator, RAGRequest } from '../ragOrchestrator';
import { StreamingHandler, StreamingChunk, StreamingOptions } from '../llm/streamingHandler';

export interface RAGStreamingOptions extends StreamingOptions {
  enableSourceCitations?: boolean;
  contextWindow?: number;
  maxTokens?: number;
}

export interface RAGStreamingResult {
  fullResponse: string;
  sources: Array<{
    id: string;
    name: string;
    relevance: number;
  }>;
  metadata: {
    totalChunks: number;
    streamingTime: number;
    tokensGenerated: number;
  };
}

export class RAGStreamingProcessor {
  static async processStreamingRAGQuery(
    query: string,
    agentId: string,
    options: RAGStreamingOptions = {},
    conversationId?: string
  ): Promise<RAGStreamingResult> {
    const startTime = Date.now();
    
    console.log('🌊 Starting streaming RAG query processing:', {
      query: query.substring(0, 50) + '...',
      agentId,
      streaming: true
    });

    try {
      let fullResponse = '';
      let chunkCount = 0;
      const sources: RAGStreamingResult['sources'] = [];

      // Enhanced streaming options with RAG context
      const streamingOptions: StreamingOptions = {
        onChunk: (chunk: StreamingChunk) => {
          if (!chunk.isComplete) {
            fullResponse += chunk.delta;
            chunkCount++;
            
            // Call user's chunk handler if provided
            options.onChunk?.(chunk);
          } else {
            // Final chunk - process metadata
            console.log('🏁 RAG streaming complete');
            options.onComplete?.(fullResponse);
          }
        },
        onError: options.onError,
        abortSignal: options.abortSignal
      };

      // Build RAG request with streaming enabled
      const ragRequest: RAGRequest = {
        query,
        agentId,
        conversationId,
        options: {
          streaming: true,
          streamingOptions,
          searchFilters: {
            maxResults: 5,
            minSimilarity: 0.3
          },
          rankingOptions: {
            maxChunks: options.contextWindow || 5,
            maxTokens: options.maxTokens || 2000
          },
          llmOptions: {
            temperature: 0.7,
            maxTokens: options.maxTokens || 1000
          },
          postProcessing: {
            addSourceCitations: options.enableSourceCitations ?? true,
            formatMarkdown: true
          }
        }
      };

      // Process RAG request with streaming
      const ragResponse = await RAGOrchestrator.processRAGRequest(ragRequest);

      // Extract sources from response
      ragResponse.queryResult.rankedContext.chunks.forEach(chunk => {
        sources.push({
          id: chunk.sourceId,
          name: chunk.metadata.sourceName,
          relevance: chunk.relevanceScore
        });
      });

      const streamingTime = Date.now() - startTime;

      const result: RAGStreamingResult = {
        fullResponse,
        sources,
        metadata: {
          totalChunks: chunkCount,
          streamingTime,
          tokensGenerated: fullResponse.split(' ').length
        }
      };

      console.log('✅ RAG streaming processing complete:', {
        streamingTime,
        totalChunks: chunkCount,
        sourcesUsed: sources.length
      });

      return result;
    } catch (error) {
      console.error('❌ RAG streaming processing failed:', error);
      throw error;
    }
  }

  static async processStreamingRAGBatch(
    queries: string[],
    agentId: string,
    options: RAGStreamingOptions = {},
    conversationId?: string
  ): Promise<RAGStreamingResult[]> {
    console.log('📊 Processing batch streaming RAG queries:', queries.length);

    const results = await Promise.all(
      queries.map(query => 
        this.processStreamingRAGQuery(query, agentId, options, conversationId)
      )
    );

    console.log('✅ Batch streaming processing complete');
    return results;
  }

  static createStreamingSession(
    agentId: string,
    options: RAGStreamingOptions = {}
  ): {
    processQuery: (query: string) => Promise<RAGStreamingResult>;
    destroy: () => void;
  } {
    const sessionId = `rag-session-${Date.now()}`;
    
    console.log('🔗 Creating RAG streaming session:', sessionId);

    return {
      processQuery: (query: string) => 
        this.processStreamingRAGQuery(query, agentId, options),
      destroy: () => {
        console.log('🗑️ Destroying RAG streaming session:', sessionId);
        // Cleanup any active streams
        StreamingHandler.abortAllStreams();
      }
    };
  }
}
