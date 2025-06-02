
// Export all performance services
export { CacheService, globalCache } from './cacheService';
export { PerformanceMonitor, globalPerformanceMonitor } from './performanceMonitor';
export { OptimizationService, globalOptimizationService } from './optimizationService';

// Export types
export type { 
  CacheEntry, 
  CacheStats, 
  CacheOptions 
} from './cacheService';

export type { 
  PerformanceMetric, 
  PerformanceSnapshot, 
  PerformanceAlert 
} from './performanceMonitor';

export type { 
  OptimizationStrategy, 
  OptimizationResult 
} from './optimizationService';
