
export interface ExpansionStrategy {
  name: string;
  enabled: boolean;
  weight: number;
  maxExpansions: number;
}

export class ExpansionStrategiesManager {
  private static readonly DEFAULT_STRATEGIES: Record<string, ExpansionStrategy> = {
    synonym_expansion: {
      name: 'Synonym Expansion',
      enabled: true,
      weight: 0.8,
      maxExpansions: 3
    },
    concept_broadening: {
      name: 'Concept Broadening',
      enabled: true,
      weight: 0.6,
      maxExpansions: 2
    },
    context_injection: {
      name: 'Context Injection',
      enabled: true,
      weight: 0.9,
      maxExpansions: 1
    },
    intent_clarification: {
      name: 'Intent Clarification',
      enabled: true,
      weight: 0.7,
      maxExpansions: 2
    }
  };

  static getExpansionStrategies(): Record<string, ExpansionStrategy> {
    return { ...this.DEFAULT_STRATEGIES };
  }

  static updateExpansionStrategy(
    strategyName: string,
    updates: Partial<ExpansionStrategy>
  ): boolean {
    if (this.DEFAULT_STRATEGIES[strategyName]) {
      Object.assign(this.DEFAULT_STRATEGIES[strategyName], updates);
      return true;
    }
    return false;
  }

  static getActiveStrategies(
    customStrategies?: Partial<Record<string, ExpansionStrategy>>
  ): Record<string, ExpansionStrategy> {
    return { ...this.DEFAULT_STRATEGIES, ...customStrategies };
  }
}
