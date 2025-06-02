
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

  // Analyze and route query
  const analyzeQuery = useCallback(async (
    query: string,
    agentId: string,
    conversationId?: string
  ) => {
    setIsAnalyzing(true);
    try {
      const analysis = await IntelligentRoutingService.analyzeAndRoute(
        query,
        agentId,
        conversationId
      );
      setCurrentAnalysis(analysis);
      return analysis;
    } catch (error) {
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
    try {
      const expansion = await QueryExpansionService.expandQuery(
        query,
        agentId,
        conversationId
      );
      return expansion;
    } catch (error) {
      console.error('Failed to expand query:', error);
      throw error;
    }
  }, []);

  // Get conversation context
  const getConversationContext = useCallback(async (
    conversationId: string,
    agentId: string
  ) => {
    try {
      const context = await ConversationContextManager.getConversationContext(
        conversationId,
        agentId
      );
      setConversationContext(context);
      return context;
    } catch (error) {
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
    try {
      await ConversationContextManager.updateConversationContext(
        conversationId,
        userMessage,
        assistantResponse
      );
      
      // Refresh context
      if (conversationContext?.conversationId === conversationId) {
        const updated = await ConversationContextManager.getConversationContext(
          conversationId,
          conversationContext.agentId
        );
        setConversationContext(updated);
      }
    } catch (error) {
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
    try {
      const analyses = await IntelligentRoutingService.batchAnalyzeQueries(
        queries,
        agentId,
        conversationId
      );
      return analyses;
    } catch (error) {
      console.error('Failed to batch analyze queries:', error);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Get expansion strategies
  const getExpansionStrategies = useCallback(() => {
    return QueryExpansionService.getExpansionStrategies();
  }, []);

  // Update expansion strategy
  const updateExpansionStrategy = useCallback((
    strategyName: string,
    updates: any
  ) => {
    return QueryExpansionService.updateExpansionStrategy(strategyName, updates);
  }, []);

  // Get routing statistics
  const getRoutingStatistics = useCallback(() => {
    return IntelligentRoutingService.getRoutingStatistics();
  }, []);

  // Clean up old conversations
  const cleanupOldConversations = useCallback(() => {
    ConversationContextManager.cleanupOldConversations();
  }, []);

  return {
    // State
    isAnalyzing,
    currentAnalysis,
    conversationContext,

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
    cleanupOldConversations
  };
};

export default useAdvancedRAG;
