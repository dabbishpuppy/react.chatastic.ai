
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

export interface QueryExpansion {
  originalQuery: string;
  expandedQueries: string[];
  synonyms: Record<string, string[]>;
  relatedConcepts: string[];
  negativeTerms: string[];
  confidence: number;
}
