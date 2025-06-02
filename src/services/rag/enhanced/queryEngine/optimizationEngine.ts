
import { globalOptimizationService } from '../../performance/optimizationService';

export interface OptimizationRecommendation {
  type: 'query' | 'filtering' | 'ranking' | 'caching';
  priority: 'low' | 'medium' | 'high';
  description: string;
  estimatedImpact: number; // Percentage improvement
  implementation: string;
}

export class OptimizationEngine {
  static analyzeQueryPerformance(queryHistory: any[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Analyze average response times
    const avgResponseTime = queryHistory.reduce((sum, q) => sum + q.processingTime, 0) / queryHistory.length;

    if (avgResponseTime > 2000) {
      recommendations.push({
        type: 'query',
        priority: 'high',
        description: 'Query processing is taking longer than optimal',
        estimatedImpact: 30,
        implementation: 'Consider enabling aggressive optimization level'
      });
    }

    // Analyze cache hit rates
    const cacheHitRate = queryHistory.filter(q => q.cacheHit).length / queryHistory.length;

    if (cacheHitRate < 0.2) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        description: 'Low cache hit rate detected',
        estimatedImpact: 25,
        implementation: 'Implement query similarity clustering for better cache utilization'
      });
    }

    // Analyze result quality vs speed tradeoffs
    const lowQualityQueries = queryHistory.filter(q => 
      q.rankedContext?.totalRelevanceScore < 2.0
    ).length;

    if (lowQualityQueries / queryHistory.length > 0.3) {
      recommendations.push({
        type: 'ranking',
        priority: 'high',
        description: 'Result quality below threshold',
        estimatedImpact: 40,
        implementation: 'Adjust similarity thresholds and ranking parameters'
      });
    }

    return recommendations;
  }

  static generateOptimizationPlan(
    recommendations: OptimizationRecommendation[]
  ): {
    plan: Array<{
      step: number;
      action: string;
      expectedImpact: number;
      timeframe: string;
    }>;
    totalExpectedImprovement: number;
  } {
    const sortedRecommendations = recommendations
      .sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return (priorityWeight[b.priority] * b.estimatedImpact) - 
               (priorityWeight[a.priority] * a.estimatedImpact);
      });

    const plan = sortedRecommendations.map((rec, index) => ({
      step: index + 1,
      action: rec.implementation,
      expectedImpact: rec.estimatedImpact,
      timeframe: rec.priority === 'high' ? 'immediate' : 
                rec.priority === 'medium' ? '1-2 days' : '1 week'
    }));

    const totalExpectedImprovement = Math.min(
      sortedRecommendations.reduce((sum, rec) => sum + rec.estimatedImpact, 0) * 0.7,
      80 // Cap at 80% improvement to be realistic
    );

    return {
      plan,
      totalExpectedImprovement
    };
  }

  static applyAutomaticOptimizations(queryRequest: any): {
    optimizedRequest: any;
    optimizationsApplied: string[];
  } {
    const optimizations: string[] = [];
    let optimizedRequest = { ...queryRequest };

    // Get current system recommendations
    const recommendations = globalOptimizationService.getRecommendations();

    // Apply caching optimizations
    if (recommendations.some(r => r.includes('cache'))) {
      // Enable more aggressive caching
      optimizedRequest.cacheStrategy = 'aggressive';
      optimizations.push('aggressive_caching');
    }

    // Apply filtering optimizations
    if (recommendations.some(r => r.includes('filter'))) {
      optimizedRequest.searchFilters = {
        ...optimizedRequest.searchFilters,
        minSimilarity: Math.max(optimizedRequest.searchFilters?.minSimilarity || 0.3, 0.4)
      };
      optimizations.push('enhanced_filtering');
    }

    // Apply ranking optimizations
    if (recommendations.some(r => r.includes('ranking'))) {
      optimizedRequest.rankingOptions = {
        ...optimizedRequest.rankingOptions,
        diversityThreshold: 0.8,
        maxChunks: Math.min(optimizedRequest.rankingOptions?.maxChunks || 5, 3)
      };
      optimizations.push('optimized_ranking');
    }

    return {
      optimizedRequest,
      optimizationsApplied: optimizations
    };
  }
}
