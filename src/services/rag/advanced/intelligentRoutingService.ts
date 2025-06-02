
import { QueryExpansionService, QueryExpansion } from './queryExpansionService';
import { ConversationContextManager } from './conversationContextManager';

export interface QueryIntent {
  type: 'question' | 'command' | 'request' | 'complaint' | 'compliment';
  confidence: number;
  subcategory?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'simple' | 'moderate' | 'complex' | 'expert';
}

export interface RoutingDecision {
  route: 'standard' | 'enhanced' | 'expert' | 'escalate';
  reason: string;
  confidence: number;
  recommendedStrategy: string;
  estimatedResponseTime: number;
  requiredResources: string[];
}

export interface QueryAnalysis {
  originalQuery: string;
  intent: QueryIntent;
  expansion: QueryExpansion;
  routing: RoutingDecision;
  preprocessingTime: number;
}

export class IntelligentRoutingService {
  private static readonly INTENT_PATTERNS = {
    question: [
      /\b(what|how|why|when|where|who|which|can you|could you|do you know)\b/i,
      /\?$/,
      /\b(explain|tell me|help me understand)\b/i
    ],
    command: [
      /\b(show me|give me|find|search|list|display)\b/i,
      /\b(create|make|build|generate)\b/i,
      /\b(update|change|modify|edit)\b/i
    ],
    request: [
      /\b(please|could you|would you|can you help)\b/i,
      /\b(i need|i want|i would like)\b/i,
      /\b(assist|support|guide)\b/i
    ],
    complaint: [
      /\b(problem|issue|error|bug|wrong|broken|not working)\b/i,
      /\b(frustrated|annoyed|disappointed)\b/i,
      /\b(terrible|awful|horrible|worst)\b/i
    ],
    compliment: [
      /\b(great|excellent|amazing|wonderful|perfect|love)\b/i,
      /\b(thank you|thanks|appreciate)\b/i,
      /\b(good job|well done|impressed)\b/i
    ]
  };

  private static readonly COMPLEXITY_INDICATORS = {
    simple: [
      /\b(yes|no|simple|basic|quick)\b/i,
      /^.{1,50}$/  // Short queries
    ],
    moderate: [
      /\b(compare|difference|between|versus)\b/i,
      /\b(multiple|several|various)\b/i
    ],
    complex: [
      /\b(comprehensive|detailed|thorough|complex)\b/i,
      /\b(integrate|implement|configure|optimize)\b/i,
      /\b(analysis|strategy|solution|architecture)\b/i
    ],
    expert: [
      /\b(technical|advanced|expert|professional)\b/i,
      /\b(algorithm|framework|methodology|paradigm)\b/i,
      /\b(performance|scalability|security|compliance)\b/i
    ]
  };

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
      const intent = this.analyzeIntent(query);
      
      // Expand query
      const expansion = await QueryExpansionService.expandQuery(
        query,
        agentId,
        conversationId
      );
      
      // Make routing decision
      const routing = this.makeRoutingDecision(query, intent, expansion);
      
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

  private static analyzeIntent(query: string): QueryIntent {
    const lowerQuery = query.toLowerCase();
    let bestMatch: { type: keyof typeof this.INTENT_PATTERNS; confidence: number } = {
      type: 'question',
      confidence: 0
    };

    // Check each intent pattern
    for (const [intentType, patterns] of Object.entries(this.INTENT_PATTERNS)) {
      let matches = 0;
      let totalPatterns = patterns.length;

      for (const pattern of patterns) {
        if (pattern.test(lowerQuery)) {
          matches++;
        }
      }

      const confidence = matches / totalPatterns;
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          type: intentType as keyof typeof this.INTENT_PATTERNS,
          confidence
        };
      }
    }

    // Determine urgency
    const urgency = this.determineUrgency(query);
    
    // Determine complexity
    const complexity = this.determineComplexity(query);

    return {
      type: bestMatch.type,
      confidence: Math.max(bestMatch.confidence, 0.3), // Minimum confidence
      urgency,
      complexity
    };
  }

  private static determineUrgency(query: string): QueryIntent['urgency'] {
    const lowerQuery = query.toLowerCase();
    
    if (/\b(urgent|emergency|critical|asap|immediately|now)\b/i.test(lowerQuery)) {
      return 'critical';
    }
    
    if (/\b(soon|quickly|fast|priority|important)\b/i.test(lowerQuery)) {
      return 'high';
    }
    
    if (/\b(whenever|later|eventually|time|schedule)\b/i.test(lowerQuery)) {
      return 'low';
    }
    
    return 'medium';
  }

  private static determineComplexity(query: string): QueryIntent['complexity'] {
    const lowerQuery = query.toLowerCase();
    
    // Check each complexity level
    for (const [level, patterns] of Object.entries(this.COMPLEXITY_INDICATORS)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerQuery)) {
          return level as QueryIntent['complexity'];
        }
      }
    }
    
    // Default based on query length and word complexity
    if (query.length < 20) return 'simple';
    if (query.length > 100) return 'complex';
    
    return 'moderate';
  }

  private static makeRoutingDecision(
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
