
import { OrchestrationConfig } from './types';

export class ConfigurationManager {
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
    
    // Add validation logic here
    if (typeof config.enableMetrics !== 'boolean') {
      errors.push('enableMetrics must be a boolean');
    }
    
    if (typeof config.enableAlerting !== 'boolean') {
      errors.push('enableAlerting must be a boolean');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static getDefaultConfig(): OrchestrationConfig {
    return { ...this.defaultConfig };
  }
}
