
import { ContentAnalysisService } from '../services/contentAnalysisService';
import { ContentCleaningService } from '../services/contentCleaningService';
import { CompressionService } from '../services/compression/compressionService';
import { DeduplicationService } from '../services/deduplicationService';
import { CompressionStatsService } from '../services/compressionStatsService';

export type { CompressionResult, ContentAnalysis, DeduplicationResult, CompressionStats } from '../types/compressionTypes';

export class CompressionEngine {
  // Content analysis methods
  static analyzeContent = ContentAnalysisService.analyzeContent;
  static selectProcessingMode = ContentAnalysisService.selectProcessingMode;
  
  // Content cleaning methods
  static enhancedContentCleaning = ContentCleaningService.enhancedContentCleaning;
  
  // Compression methods
  static compressWithMaximumEfficiency = CompressionService.compressWithMaximumEfficiency;
  
  // Deduplication methods
  static performAdvancedDeduplication = DeduplicationService.performAdvancedDeduplication;
  
  // Stats methods
  static getCompressionStats = CompressionStatsService.getCompressionStats;
}
