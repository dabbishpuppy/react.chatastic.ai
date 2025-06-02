
import { useState, useEffect, useCallback } from 'react';
import {
  globalPerformanceMonitor,
  globalOptimizationService,
  globalCache,
  type PerformanceSnapshot,
  type OptimizationResult
} from '@/services/rag/performance';

export const useRAGPerformance = () => {
  const [snapshot, setSnapshot] = useState<PerformanceSnapshot | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult[]>([]);

  // Get current performance snapshot
  const refreshSnapshot = useCallback(() => {
    const currentSnapshot = globalPerformanceMonitor.getSnapshot();
    setSnapshot(currentSnapshot);
  }, []);

  // Run auto-optimizations
  const runOptimizations = useCallback(async () => {
    setIsOptimizing(true);
    try {
      const results = await globalOptimizationService.applyAutoOptimizations();
      setOptimizationResults(prev => [...prev, ...results]);
      refreshSnapshot(); // Refresh snapshot after optimization
      return results;
    } catch (error) {
      console.error('Failed to run optimizations:', error);
      throw error;
    } finally {
      setIsOptimizing(false);
    }
  }, [refreshSnapshot]);

  // Run specific optimization
  const runSpecificOptimization = useCallback(async (strategy: string) => {
    setIsOptimizing(true);
    try {
      const result = await globalOptimizationService.optimizeSpecific(strategy);
      setOptimizationResults(prev => [...prev, result]);
      refreshSnapshot();
      return result;
    } catch (error) {
      console.error(`Failed to run ${strategy} optimization:`, error);
      throw error;
    } finally {
      setIsOptimizing(false);
    }
  }, [refreshSnapshot]);

  // Get performance metrics for a specific operation
  const getMetrics = useCallback((metricName: string, limit?: number) => {
    return globalPerformanceMonitor.getMetricsByName(metricName, limit);
  }, []);

  // Get average metric value
  const getAverageMetric = useCallback((metricName: string, timeWindowMs?: number) => {
    return globalPerformanceMonitor.getAverageMetric(metricName, timeWindowMs);
  }, []);

  // Get optimization recommendations
  const getRecommendations = useCallback(() => {
    return globalOptimizationService.getRecommendations();
  }, []);

  // Clear cache
  const clearCache = useCallback(async () => {
    await globalCache.clear();
    refreshSnapshot();
  }, [refreshSnapshot]);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    return globalCache.getStats();
  }, []);

  // Get recent alerts
  const getAlerts = useCallback((limit?: number) => {
    return globalPerformanceMonitor.getAlerts(limit);
  }, []);

  // Generate performance report
  const generateReport = useCallback((timeWindowMs?: number) => {
    return globalPerformanceMonitor.generateReport(timeWindowMs);
  }, []);

  // Auto-refresh snapshot every 30 seconds
  useEffect(() => {
    refreshSnapshot(); // Initial load
    
    const interval = setInterval(refreshSnapshot, 30000);
    return () => clearInterval(interval);
  }, [refreshSnapshot]);

  return {
    // State
    snapshot,
    isOptimizing,
    optimizationResults,

    // Actions
    refreshSnapshot,
    runOptimizations,
    runSpecificOptimization,
    clearCache,

    // Getters
    getMetrics,
    getAverageMetric,
    getRecommendations,
    getCacheStats,
    getAlerts,
    generateReport
  };
};

export default useRAGPerformance;
