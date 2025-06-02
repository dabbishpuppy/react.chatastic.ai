
// Re-export the modular compression engine for backward compatibility
export { CompressionEngine as AdvancedCompressionEngine } from './compression';
export type { CompressionResult, ContentAnalysis, DeduplicationResult, CompressionStats } from './types/compressionTypes';

// Legacy class that delegates to the new modular implementation
import { CompressionEngine } from './compression';

export class AdvancedCompressionEngineLegacy {
  // Re-export content analysis methods
  static analyzeContent = CompressionEngine.analyzeContent;
  static selectProcessingMode = CompressionEngine.selectProcessingMode;
  
  // Re-export content cleaning methods
  static enhancedContentCleaning = CompressionEngine.enhancedContentCleaning;
  
  // Re-export compression methods
  static compressWithMaximumEfficiency = CompressionEngine.compressWithMaximumEfficiency;
  
  // Re-export deduplication methods
  static performAdvancedDeduplication = CompressionEngine.performAdvancedDeduplication;
  
  // Re-export stats methods
  static getCompressionStats = CompressionEngine.getCompressionStats;
}

// Default export for backward compatibility
export default AdvancedCompressionEngineLegacy;
