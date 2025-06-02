
import { LLMRequest, LLMResponse } from '../llm/llmRouter';
import { StreamingHandler, StreamingOptions } from '../llm/streamingHandler';

export class StreamingManager {
  static async handleStreamingResponse(
    llmRequest: LLMRequest,
    queryResult: any,
    streamingOptions?: StreamingOptions
  ): Promise<LLMResponse> {
    const streamId = `rag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🌊 Handling streaming LLM response:', streamId);

    try {
      const fullResponse = await StreamingHandler.handleStreamingResponse(
        streamId,
        llmRequest,
        streamingOptions || {}
      );

      return {
        content: fullResponse,
        provider: 'openai',
        model: 'gpt-4o-mini',
        tokensUsed: fullResponse.split(' ').length,
        cost: 0.001,
        responseTime: 0,
        sources: queryResult.rankedContext.chunks.map((chunk: any) => ({
          sourceId: chunk.sourceId,
          sourceName: chunk.metadata.sourceName,
          chunkIndex: chunk.metadata.chunkIndex
        }))
      };
    } catch (error) {
      console.error('❌ Streaming LLM response failed:', error);
      throw error;
    }
  }

  static getActiveStreamsCount(): number {
    return StreamingHandler.getActiveStreamsCount();
  }
}
