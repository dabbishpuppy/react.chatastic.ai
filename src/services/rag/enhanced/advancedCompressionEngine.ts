
import { ContentAnalysisService } from './services/contentAnalysisService';
import { ContentCleaningService } from './services/contentCleaningService';
import { CompressionService } from './services/compression/compressionService';
import { DeduplicationService } from './services/deduplicationService';
import { CompressionStatsService } from './services/compressionStatsService';

export type { CompressionResult, ContentAnalysis, DeduplicationResult, CompressionStats } from './types/compressionTypes';

export class AdvancedCompressionEngine {
  // Re-export content analysis methods
  static analyzeContent = ContentAnalysisService.analyzeContent;
  static selectProcessingMode = ContentAnalysisService.selectProcessingMode;
  
  // Re-export content cleaning methods
  static enhancedContentCleaning = ContentCleaningService.enhancedContentCleaning;
  
  // Re-export compression methods
  static compressWithMaximumEfficiency = CompressionService.compressWithMaximumEfficiency;
  
  // Re-export deduplication methods
  static performAdvancedDeduplication = DeduplicationService.performAdvancedDeduplication;
  
  // Re-export stats methods
  static getCompressionStats = CompressionStatsService.getCompressionStats;
}
