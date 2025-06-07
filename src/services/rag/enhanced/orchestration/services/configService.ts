
import { OrchestrationConfig } from '../types';

export class ConfigService {
  private static defaultConfig: OrchestrationConfig = {
    enableMetrics: true,
    enableAlerting: true,
    enablePerformanceMonitoring: true,
    enableInfrastructureMonitoring: true,
    enableIPPoolMonitoring: true,
    enableEgressManagement: true,
    enableAutoscaling: true,
    enableConnectionPooling: true,
    enableDatabaseOptimization: true,
    enableWorkerQueue: true,
    maxRetries: 3,
    healthCheckInterval: 30000,
    alertThresholds: {
      cpu: 80,
      memory: 85,
      errorRate: 5
    }
  };

  static createConfig(userConfig: Partial<OrchestrationConfig> = {}): OrchestrationConfig {
    return {
      ...this.defaultConfig,
      ...userConfig
    };
  }

  static updateConfig(
    currentConfig: OrchestrationConfig, 
    updates: Partial<OrchestrationConfig>
  ): OrchestrationConfig {
    return {
      ...currentConfig,
      ...updates
    };
  }

  static validateConfig(config: OrchestrationConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate each configuration option
    const booleanFields = [
      'enableMetrics', 'enableAlerting', 'enablePerformanceMonitoring',
      'enableInfrastructureMonitoring', 'enableIPPoolMonitoring',
      'enableEgressManagement', 'enableAutoscaling', 'enableConnectionPooling',
      'enableDatabaseOptimization', 'enableWorkerQueue'
    ];

    for (const field of booleanFields) {
      if (typeof config[field as keyof OrchestrationConfig] !== 'boolean') {
        errors.push(`${field} must be a boolean`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static getDefaultConfig(): OrchestrationConfig {
    return { ...this.defaultConfig };
  }

  static mergeConfigs(base: OrchestrationConfig, override: Partial<OrchestrationConfig>): OrchestrationConfig {
    return { ...base, ...override };
  }

  static exportConfig(config: OrchestrationConfig): string {
    return JSON.stringify(config, null, 2);
  }

  static importConfig(configString: string): OrchestrationConfig {
    try {
      const parsed = JSON.parse(configString);
      const validation = this.validateConfig(parsed);
      
      if (!validation.valid) {
        throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
      }
      
      return parsed;
    } catch (error) {
      throw new Error(`Failed to import config: ${error}`);
    }
  }
}
