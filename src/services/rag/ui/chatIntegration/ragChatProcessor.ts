import { RAGOrchestrator, RAGRequest, RAGResponse } from '../../ragOrchestrator';
import { AdvancedQueryPreprocessor } from '../../queryProcessing/advancedQueryPreprocessor';
import { ChatRAGOptions, ChatRAGResult } from '../ragChatIntegration';
import { supabase } from '@/integrations/supabase/client';

export class RAGChatProcessor {
  static async processMessageWithRAG(
    message: string,
    agentId: string,
    conversationId?: string,
    options: ChatRAGOptions = {},
    callbacks?: {
      onThinkingStart?: () => void;
      onThinkingEnd?: () => void;
      onTypingStart?: (messageId: string) => void;
      onTypingComplete?: (messageId: string) => void;
    }
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

      // Start thinking callback
      callbacks?.onThinkingStart?.();

      // Load agent's AI configuration from database
      console.log('📖 Loading agent AI configuration for agent:', agentId);
      const { data: agentConfig, error: agentError } = await supabase
        .from('agents')
        .select('ai_model, ai_instructions, ai_temperature')
        .eq('id', agentId)
        .single();

      if (agentError) {
        console.error('❌ Failed to load agent AI configuration:', agentError);
        callbacks?.onThinkingEnd?.();
        throw new Error('Failed to load agent AI configuration');
      }

      if (!agentConfig) {
        console.error('❌ Agent configuration not found for agent:', agentId);
        callbacks?.onThinkingEnd?.();
        throw new Error('Agent configuration not found');
      }

      console.log('✅ Agent AI configuration loaded:', {
        model: agentConfig.ai_model,
        temperature: agentConfig.ai_temperature,
        hasInstructions: !!agentConfig.ai_instructions
      });

      // Perform advanced query analysis
      const advancedAnalysis = await AdvancedQueryPreprocessor.preprocessQueryWithContext(
        message,
        agentId,
        conversationId
      );

      // Thinking delay to show thinking dots (1 second)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // End thinking callback
      callbacks?.onThinkingEnd?.();

      // Build RAG request with agent's AI configuration
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
            model: agentConfig.ai_model,
            temperature: agentConfig.ai_temperature,
            systemPrompt: options.customSystemPrompt || agentConfig.ai_instructions
          },
          streaming: options.enableStreaming || false,
          postProcessing: {
            addSourceCitations: true,
            formatMarkdown: true,
            enforceContentSafety: true
          }
        }
      };

      console.log('🚀 Processing RAG request with agent configuration:', {
        model: ragRequest.options.llmOptions?.model,
        temperature: ragRequest.options.llmOptions?.temperature,
        hasSystemPrompt: !!ragRequest.options.llmOptions?.systemPrompt
      });

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
        responseLength: result.response.length,
        modelUsed: agentConfig.ai_model
      });

      return result;
    } catch (error) {
      console.error('❌ RAG chat integration failed:', error);
      
      // End thinking on error
      callbacks?.onThinkingEnd?.();
      
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
