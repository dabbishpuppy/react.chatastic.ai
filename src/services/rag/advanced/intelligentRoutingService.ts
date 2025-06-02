
import { QueryExpansionService } from './queryExpansionService';
import { IntentAnalyzer } from './intentAnalyzer';
import { RoutingDecisionMaker } from './routingDecisionMaker';
import { QueryAnalysis } from './types';

export class IntelligentRoutingService {
  static async analyzeAndRoute(
    query: string,
    agentId: string,
    conversationId?: string
  ): Promise<QueryAnalysis> {
    const startTime = Date.now();
    
    console.log('🎯 Analyzing and routing query:', {
      query: query.substring(0, 50) + '...',
      agentId,
      hasConversation: !!conversationId
    });

    try {
      // Analyze intent
      const intent = IntentAnalyzer.analyzeIntent(query);
      
      // Expand query
      const expansion = await QueryExpansionService.expandQuery(
        query,
        agentId,
        conversationId
      );
      
      // Make routing decision
      const routing = RoutingDecisionMaker.makeRoutingDecision(query, intent, expansion);
      
      const preprocessingTime = Date.now() - startTime;
      
      const analysis: QueryAnalysis = {
        originalQuery: query,
        intent,
        expansion,
        routing,
        preprocessingTime
      };

      console.log('✅ Query analysis complete:', {
        intent: intent.type,
        complexity: intent.complexity,
        route: routing.route,
        confidence: routing.confidence,
        preprocessingTime
      });

      return analysis;

    } catch (error) {
      console.error('❌ Query analysis failed:', error);
      
      return {
        originalQuery: query,
        intent: {
          type: 'question',
          confidence: 0.3,
          urgency: 'medium',
          complexity: 'moderate'
        },
        expansion: {
          originalQuery: query,
          expandedQueries: [query],
          synonyms: {},
          relatedConcepts: [],
          negativeTerms: [],
          confidence: 0.3
        },
        routing: {
          route: 'standard',
          reason: 'Fallback due to analysis error',
          confidence: 0.3,
          recommendedStrategy: 'basic_search',
          estimatedResponseTime: 3000,
          requiredResources: ['basic_search']
        },
        preprocessingTime: Date.now() - startTime
      };
    }
  }

  static async batchAnalyzeQueries(
    queries: string[],
    agentId: string,
    conversationId?: string
  ): Promise<QueryAnalysis[]> {
    console.log('📊 Batch analyzing queries:', queries.length);
    
    const analyses = await Promise.all(
      queries.map(query => this.analyzeAndRoute(query, agentId, conversationId))
    );
    
    console.log('✅ Batch analysis complete');
    return analyses;
  }

  static getRoutingStatistics(): {
    totalQueries: number;
    routeDistribution: Record<string, number>;
    averageConfidence: number;
    averageProcessingTime: number;
  } {
    return RoutingDecisionMaker.getRoutingStatistics();
  }
}
