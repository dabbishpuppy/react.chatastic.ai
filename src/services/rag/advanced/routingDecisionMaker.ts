
import { QueryIntent, RoutingDecision, QueryExpansion } from './types';

export class RoutingDecisionMaker {
  static makeRoutingDecision(
    query: string,
    intent: QueryIntent,
    expansion: QueryExpansion
  ): RoutingDecision {
    // Determine route based on complexity and intent
    let route: RoutingDecision['route'] = 'standard';
    let estimatedResponseTime = 2000;
    let requiredResources: string[] = ['basic_search'];
    let recommendedStrategy = 'basic_search';

    // Route based on complexity
    if (intent.complexity === 'expert' || intent.urgency === 'critical') {
      route = 'expert';
      estimatedResponseTime = 8000;
      requiredResources = ['advanced_search', 'context_analysis', 'expert_knowledge'];
      recommendedStrategy = 'expert_analysis';
    } else if (intent.complexity === 'complex' || expansion.confidence > 0.8) {
      route = 'enhanced';
      estimatedResponseTime = 5000;
      requiredResources = ['enhanced_search', 'context_analysis', 'query_expansion'];
      recommendedStrategy = 'enhanced_search';
    } else if (intent.type === 'complaint' && intent.urgency === 'high') {
      route = 'escalate';
      estimatedResponseTime = 1000;
      requiredResources = ['escalation_handler'];
      recommendedStrategy = 'immediate_escalation';
    }

    // Calculate routing confidence
    let confidence = 0.5;
    
    if (intent.confidence > 0.7) confidence += 0.2;
    if (expansion.confidence > 0.7) confidence += 0.2;
    if (intent.complexity !== 'moderate') confidence += 0.1;
    
    confidence = Math.min(confidence, 1.0);

    const reason = this.generateRoutingReason(route, intent, expansion);

    return {
      route,
      reason,
      confidence,
      recommendedStrategy,
      estimatedResponseTime,
      requiredResources
    };
  }

  private static generateRoutingReason(
    route: RoutingDecision['route'],
    intent: QueryIntent,
    expansion: QueryExpansion
  ): string {
    switch (route) {
      case 'expert':
        return `Expert routing due to ${intent.complexity} complexity and ${intent.urgency} urgency`;
      case 'enhanced':
        return `Enhanced routing for ${intent.complexity} query with ${expansion.expandedQueries.length} expansions`;
      case 'escalate':
        return `Escalation required for ${intent.type} with ${intent.urgency} urgency`;
      default:
        return `Standard routing for ${intent.type} query with ${intent.complexity} complexity`;
    }
  }

  static getRoutingStatistics(): {
    totalQueries: number;
    routeDistribution: Record<string, number>;
    averageConfidence: number;
    averageProcessingTime: number;
  } {
    // In a real implementation, this would track actual metrics
    return {
      totalQueries: 0,
      routeDistribution: {
        standard: 60,
        enhanced: 25,
        expert: 10,
        escalate: 5
      },
      averageConfidence: 0.75,
      averageProcessingTime: 150
    };
  }
}
