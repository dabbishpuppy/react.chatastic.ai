
import { useState, useCallback } from 'react';
import {
  IntelligentRoutingService,
  QueryExpansionService,
  ConversationContextManager,
  type QueryAnalysis,
  type QueryExpansion,
  type ConversationMemory
} from '@/services/rag/advanced';

export const useAdvancedRAG = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<QueryAnalysis | null>(null);
  const [conversationContext, setConversationContext] = useState<ConversationMemory | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Clear any previous errors
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Analyze and route query
  const analyzeQuery = useCallback(async (
    query: string,
    agentId: string,
    conversationId?: string
  ) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const analysis = await IntelligentRoutingService.analyzeAndRoute(
        query,
        agentId,
        conversationId
      );
      setCurrentAnalysis(analysis);
      return analysis;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze query';
      setError(errorMessage);
      console.error('Failed to analyze query:', error);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Expand query with context
  const expandQuery = useCallback(async (
    query: string,
    agentId: string,
    conversationId?: string
  ) => {
    setError(null);
    
    try {
      const expansion = await QueryExpansionService.expandQuery(
        query,
        agentId,
        conversationId
      );
      return expansion;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to expand query';
      setError(errorMessage);
      console.error('Failed to expand query:', error);
      throw error;
    }
  }, []);

  // Get conversation context
  const getConversationContext = useCallback(async (
    conversationId: string,
    agentId: string
  ) => {
    setError(null);
    
    try {
      const context = await ConversationContextManager.getConversationContext(
        conversationId,
        agentId
      );
      setConversationContext(context);
      return context;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get conversation context';
      setError(errorMessage);
      console.error('Failed to get conversation context:', error);
      throw error;
    }
  }, []);

  // Update conversation context
  const updateConversationContext = useCallback(async (
    conversationId: string,
    userMessage: string,
    assistantResponse?: string
  ) => {
    setError(null);
    
    try {
      await ConversationContextManager.updateConversationContext(
        conversationId,
        userMessage,
        assistantResponse
      );
      
      // Refresh context if we have one loaded
      if (conversationContext?.conversationId === conversationId) {
        const updated = await ConversationContextManager.getConversationContext(
          conversationId,
          conversationContext.agentId
        );
        setConversationContext(updated);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update conversation context';
      setError(errorMessage);
      console.error('Failed to update conversation context:', error);
      throw error;
    }
  }, [conversationContext]);

  // Batch analyze queries
  const batchAnalyzeQueries = useCallback(async (
    queries: string[],
    agentId: string,
    conversationId?: string
  ) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const analyses = await IntelligentRoutingService.batchAnalyzeQueries(
        queries,
        agentId,
        conversationId
      );
      return analyses;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to batch analyze queries';
      setError(errorMessage);
      console.error('Failed to batch analyze queries:', error);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Get expansion strategies
  const getExpansionStrategies = useCallback(() => {
    try {
      return QueryExpansionService.getExpansionStrategies();
    } catch (error) {
      console.warn('Failed to get expansion strategies:', error);
      return {};
    }
  }, []);

  // Update expansion strategy
  const updateExpansionStrategy = useCallback((
    strategyName: string,
    updates: any
  ) => {
    try {
      return QueryExpansionService.updateExpansionStrategy(strategyName, updates);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update expansion strategy';
      setError(errorMessage);
      console.error('Failed to update expansion strategy:', error);
      return false;
    }
  }, []);

  // Get routing statistics
  const getRoutingStatistics = useCallback(() => {
    try {
      return IntelligentRoutingService.getRoutingStatistics();
    } catch (error) {
      console.warn('Failed to get routing statistics:', error);
      return {
        totalQueries: 0,
        routeDistribution: {},
        averageConfidence: 0,
        averageProcessingTime: 0
      };
    }
  }, []);

  // Clean up old conversations
  const cleanupOldConversations = useCallback(() => {
    try {
      ConversationContextManager.cleanupOldConversations();
    } catch (error) {
      console.warn('Failed to cleanup old conversations:', error);
    }
  }, []);

  return {
    // State
    isAnalyzing,
    currentAnalysis,
    conversationContext,
    error,

    // Actions
    analyzeQuery,
    expandQuery,
    getConversationContext,
    updateConversationContext,
    batchAnalyzeQueries,

    // Configuration
    getExpansionStrategies,
    updateExpansionStrategy,
    getRoutingStatistics,

    // Maintenance
    cleanupOldConversations,
    clearError
  };
};

export default useAdvancedRAG;
