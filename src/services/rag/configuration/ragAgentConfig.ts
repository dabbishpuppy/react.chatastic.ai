
export interface RAGAgentConfiguration {
  agentId: string;
  ragSettings: {
    enabled: boolean;
    maxSources: number;
    minRelevanceScore: number;
    contextWindow: number;
    streamingEnabled: boolean;
    cachingEnabled: boolean;
  };
  llmSettings: {
    preferredProvider: 'openai' | 'claude' | 'gemini';
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt?: string;
  };
  searchSettings: {
    semanticWeight: number;
    keywordWeight: number;
    recencyWeight: number;
    diversityWeight: number;
  };
  responseSettings: {
    includeCitations: boolean;
    formatMarkdown: boolean;
    addTimestamp: boolean;
    enforceContentSafety: boolean;
  };
  performanceSettings: {
    cacheTimeout: number;
    maxConcurrentRequests: number;
    timeoutMs: number;
  };
}

export const DEFAULT_RAG_CONFIG: Omit<RAGAgentConfiguration, 'agentId'> = {
  ragSettings: {
    enabled: true,
    maxSources: 5,
    minRelevanceScore: 0.3,
    contextWindow: 3,
    streamingEnabled: true,
    cachingEnabled: true
  },
  llmSettings: {
    preferredProvider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 1000
  },
  searchSettings: {
    semanticWeight: 0.7,
    keywordWeight: 0.2,
    recencyWeight: 0.05,
    diversityWeight: 0.05
  },
  responseSettings: {
    includeCitations: true,
    formatMarkdown: true,
    addTimestamp: false,
    enforceContentSafety: true
  },
  performanceSettings: {
    cacheTimeout: 300000, // 5 minutes
    maxConcurrentRequests: 10,
    timeoutMs: 30000 // 30 seconds
  }
};

export class RAGAgentConfigManager {
  private static configs = new Map<string, RAGAgentConfiguration>();

  static getAgentConfig(agentId: string): RAGAgentConfiguration {
    const existing = this.configs.get(agentId);
    
    if (existing) {
      return existing;
    }

    // Create default config for new agent
    const defaultConfig: RAGAgentConfiguration = {
      agentId,
      ...DEFAULT_RAG_CONFIG
    };

    this.configs.set(agentId, defaultConfig);
    return defaultConfig;
  }

  static updateAgentConfig(
    agentId: string,
    updates: Partial<RAGAgentConfiguration>
  ): RAGAgentConfiguration {
    const currentConfig = this.getAgentConfig(agentId);
    
    const updatedConfig: RAGAgentConfiguration = {
      ...currentConfig,
      ...updates,
      agentId // Ensure agentId is preserved
    };

    this.configs.set(agentId, updatedConfig);
    
    console.log('⚙️ Updated RAG config for agent:', {
      agentId,
      ragEnabled: updatedConfig.ragSettings.enabled,
      maxSources: updatedConfig.ragSettings.maxSources,
      preferredProvider: updatedConfig.llmSettings.preferredProvider
    });

    return updatedConfig;
  }

  static validateAgentConfig(config: RAGAgentConfiguration): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate RAG settings
    if (config.ragSettings.maxSources < 1 || config.ragSettings.maxSources > 20) {
      errors.push('maxSources must be between 1 and 20');
    }

    if (config.ragSettings.minRelevanceScore < 0 || config.ragSettings.minRelevanceScore > 1) {
      errors.push('minRelevanceScore must be between 0 and 1');
    }

    // Validate LLM settings
    if (config.llmSettings.temperature < 0 || config.llmSettings.temperature > 2) {
      errors.push('temperature must be between 0 and 2');
    }

    if (config.llmSettings.maxTokens < 1 || config.llmSettings.maxTokens > 4000) {
      errors.push('maxTokens must be between 1 and 4000');
    }

    // Validate search weights (should sum to approximately 1.0)
    const weightSum = 
      config.searchSettings.semanticWeight +
      config.searchSettings.keywordWeight +
      config.searchSettings.recencyWeight +
      config.searchSettings.diversityWeight;

    if (Math.abs(weightSum - 1.0) > 0.1) {
      errors.push('Search weights should sum to approximately 1.0');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static createAgentTemplate(
    templateName: 'support' | 'sales' | 'coding' | 'research',
    agentId: string
  ): RAGAgentConfiguration {
    const baseConfig = this.getAgentConfig(agentId);

    const templates: Record<string, Partial<RAGAgentConfiguration>> = {
      support: {
        ragSettings: {
          ...baseConfig.ragSettings,
          maxSources: 3,
          minRelevanceScore: 0.4
        },
        llmSettings: {
          ...baseConfig.llmSettings,
          temperature: 0.3,
          systemPrompt: 'You are a helpful customer support agent. Provide accurate, friendly assistance based on available documentation.'
        },
        responseSettings: {
          ...baseConfig.responseSettings,
          includeCitations: true,
          enforceContentSafety: true
        }
      },
      sales: {
        ragSettings: {
          ...baseConfig.ragSettings,
          maxSources: 5,
          minRelevanceScore: 0.3
        },
        llmSettings: {
          ...baseConfig.llmSettings,
          temperature: 0.8,
          systemPrompt: 'You are a knowledgeable sales assistant. Help customers understand products and make informed decisions.'
        }
      },
      coding: {
        ragSettings: {
          ...baseConfig.ragSettings,
          maxSources: 7,
          contextWindow: 5
        },
        llmSettings: {
          ...baseConfig.llmSettings,
          temperature: 0.1,
          systemPrompt: 'You are a coding assistant. Provide accurate, well-documented code examples and technical guidance.'
        },
        responseSettings: {
          ...baseConfig.responseSettings,
          formatMarkdown: true
        }
      },
      research: {
        ragSettings: {
          ...baseConfig.ragSettings,
          maxSources: 10,
          minRelevanceScore: 0.2
        },
        searchSettings: {
          ...baseConfig.searchSettings,
          recencyWeight: 0.15,
          diversityWeight: 0.15
        },
        llmSettings: {
          ...baseConfig.llmSettings,
          temperature: 0.5,
          systemPrompt: 'You are a research assistant. Provide comprehensive, well-sourced information on requested topics.'
        }
      }
    };

    const templateConfig = {
      ...baseConfig,
      ...templates[templateName]
    };

    this.configs.set(agentId, templateConfig);
    return templateConfig;
  }

  static exportAgentConfig(agentId: string): string {
    const config = this.getAgentConfig(agentId);
    return JSON.stringify(config, null, 2);
  }

  static importAgentConfig(agentId: string, configJson: string): RAGAgentConfiguration {
    try {
      const config = JSON.parse(configJson) as RAGAgentConfiguration;
      config.agentId = agentId; // Ensure correct agent ID
      
      const validation = this.validateAgentConfig(config);
      if (!validation.isValid) {
        throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
      }

      this.configs.set(agentId, config);
      return config;
    } catch (error) {
      console.error('❌ Failed to import agent config:', error);
      throw error;
    }
  }

  static getAllConfigs(): Map<string, RAGAgentConfiguration> {
    return new Map(this.configs);
  }

  static clearAllConfigs(): void {
    this.configs.clear();
  }
}
