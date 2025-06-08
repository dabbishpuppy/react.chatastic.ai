
import { RAGOrchestrator, RAGRequest } from '../ragOrchestrator';
import { StreamingHandler, StreamingOptions, StreamingChunk } from '../llm/streamingHandler';

export interface RAGStreamingOptions extends StreamingOptions {
  enableSourceCitations?: boolean;
  contextWindow?: number;
  maxTokens?: number;
  temperature?: number;
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
          fullResponse += chunk.delta;
          chunkCount++;
          
          // Call user's chunk handler if provided
          if (options.onChunk) {
            options.onChunk(chunk);
          }
        },
        onComplete: (response: string) => {
          console.log('🏁 RAG streaming complete');
          if (options.onComplete) {
            options.onComplete(response);
          }
        },
        onError: options.onError,
        temperature: options.temperature,
        maxTokens: options.maxTokens
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
            minSimilarity: 0.3,
            sourceTypes: []
          },
          rankingOptions: {
            maxChunks: options.contextWindow || 5,
            maxTokens: options.maxTokens || 2000,
            diversityWeight: 0.3,
            recencyWeight: 0.2
          },
          llmOptions: {
            temperature: options.temperature || 0.7
          },
          postProcessing: {
            addSourceCitations: options.enableSourceCitations ?? true,
            formatMarkdown: true,
            enforceContentSafety: true
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
