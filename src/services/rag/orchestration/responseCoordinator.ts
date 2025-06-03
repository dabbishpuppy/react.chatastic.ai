
import { RAGQueryEngine } from '../queryProcessing/ragQueryEngine';
import { LLMRouter, LLMRequest } from '../llm/llmRouter';
import { ResponsePostProcessor } from '../llm/responsePostProcessor';
import { StreamingManager } from './streamingManager';
import { RequestProcessor } from './requestProcessor';
import { RAGRequest, RAGResponse } from '../ragOrchestrator';

export class ResponseCoordinator {
  static async processRAGRequest(request: RAGRequest): Promise<RAGResponse> {
    console.log('🎯 Starting RAG request processing:', {
      query: request.query.substring(0, 50) + '...',
      agentId: request.agentId,
      streaming: request.options?.streaming || false
    });

    // Step 1: Query Processing Pipeline
    const queryStartTime = Date.now();
    const queryRequest = RequestProcessor.prepareQueryRequest(request);
    const queryResult = await RAGQueryEngine.processQuery(queryRequest);
    const queryProcessingTime = Date.now() - queryStartTime;

    // Step 2: LLM Response Generation
    const llmStartTime = Date.now();
    const llmRequest: LLMRequest = {
      query: request.query,
      context: RequestProcessor.buildContextString(queryResult),
      agentId: request.agentId,
      conversationId: request.conversationId,
      systemPrompt: request.options?.llmOptions?.systemPrompt,
      temperature: request.options?.llmOptions?.temperature,
      maxTokens: request.options?.llmOptions?.maxTokens || 1000,
      stream: request.options?.streaming
    };

    let llmResponse;
    if (request.options?.streaming) {
      llmResponse = await StreamingManager.handleStreamingResponse(
        llmRequest,
        queryResult,
        request.options.streamingOptions
      );
    } else {
      llmResponse = await LLMRouter.generateResponse(llmRequest, queryResult);
    }
    const llmResponseTime = Date.now() - llmStartTime;

    // Step 3: Post-processing
    const postProcessStartTime = Date.now();
    const processedResponse = await ResponsePostProcessor.processResponse(
      llmResponse,
      request.options?.postProcessing
    );
    const postProcessingTime = Date.now() - postProcessStartTime;

    return {
      queryResult,
      processedResponse: {
        content: processedResponse.content,
        metadata: {
          model: request.options?.llmOptions?.model || 'gpt-4o-mini',
          temperature: request.options?.llmOptions?.temperature || 0.7,
          processingTime: postProcessingTime
        }
      },
      performance: {
        totalTime: queryProcessingTime + llmResponseTime + postProcessingTime,
        queryProcessingTime,
        llmResponseTime,
        postProcessingTime
      }
    };
  }
}
