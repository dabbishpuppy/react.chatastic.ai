
import { ConfigService } from './services/configService';
import type { OrchestrationConfig } from './types';

export class ConfigurationManager {
  // Re-export ConfigService methods for backward compatibility
  static createConfig = ConfigService.createConfig;
  static updateConfig = ConfigService.updateConfig;
  static validateConfig = ConfigService.validateConfig;
  static getDefaultConfig = ConfigService.getDefaultConfig;
  
  // Additional convenience methods
  static mergeConfigs = ConfigService.mergeConfigs;
  static exportConfig = ConfigService.exportConfig;
  static importConfig = ConfigService.importConfig;
}
