
import { QueryIntent } from './types';

export class IntentAnalyzer {
  private static readonly INTENT_PATTERNS: Record<QueryIntent['type'], RegExp[]> = {
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

  static analyzeIntent(query: string): QueryIntent {
    const lowerQuery = query.toLowerCase();
    let bestMatch: { type: QueryIntent['type']; confidence: number } = {
      type: 'question',
      confidence: 0
    };

    // Check each intent pattern with proper typing
    for (const intentType of Object.keys(this.INTENT_PATTERNS) as Array<keyof typeof this.INTENT_PATTERNS>) {
      const patterns = this.INTENT_PATTERNS[intentType];
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
          type: intentType,
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
}
