
// Updated to use modular query engine components
export { EnhancedQueryProcessor, type EnhancedQueryRequest, type EnhancedQueryResult } from './queryEngine/enhancedQueryProcessor';
export { StreamingProcessor, type StreamingProgressCallback } from './queryEngine/streamingProcessor';
export { OptimizationEngine } from './queryEngine/optimizationEngine';
export { QueryAnalytics } from './queryEngine/queryAnalytics';

// Re-export main functions for backward compatibility
import { EnhancedQueryProcessor } from './queryEngine/enhancedQueryProcessor';
import { StreamingProcessor } from './queryEngine/streamingProcessor';

export class RAGQueryEngineEnhanced {
  static async processQueryWithOptimizations(request: any) {
    return EnhancedQueryProcessor.processQueryWithOptimizations(request);
  }

  static async processQueryWithStreaming(request: any, progressCallback: any) {
    return StreamingProcessor.processQueryWithStreaming(request, progressCallback);
  }
}
