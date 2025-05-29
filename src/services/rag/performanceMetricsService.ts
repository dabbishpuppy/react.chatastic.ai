
import { supabase } from "@/integrations/supabase/client";

interface MetricInput {
  sourceId?: string;
  agentId: string;
  teamId: string;
  phase: 'extraction' | 'cleaning' | 'chunking' | 'embedding' | 'deduplication';
  inputSize?: number;
  outputSize?: number;
  itemsProcessed?: number;
  successRate?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

interface PerformanceMetrics {
  id: string;
  sourceId?: string;
  agentId: string;
  teamId: string;
  phase: string;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  inputSize?: number;
  outputSize?: number;
  itemsProcessed?: number;
  successRate?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface AggregatedMetrics {
  phase: string;
  avgDurationMs: number;
  totalInputSize: number;
  totalOutputSize: number;
  totalItemsProcessed: number;
  avgSuccessRate: number;
  compressionRatio: number;
  throughputPerSecond: number;
}

export class PerformanceMetricsService {
  private static activeMetrics = new Map<string, { id: string; startTime: number }>();

  // Start tracking a performance metric
  static async startMetric(input: MetricInput): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('crawl_performance_metrics')
        .insert({
          source_id: input.sourceId,
          agent_id: input.agentId,
          team_id: input.teamId,
          phase: input.phase,
          start_time: new Date().toISOString(),
          input_size: input.inputSize,
          items_processed: input.itemsProcessed,
          metadata: input.metadata || {}
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error starting metric:', error);
        return '';
      }

      const metricId = data.id;
      const key = `${input.agentId}-${input.phase}`;
      this.activeMetrics.set(key, { 
        id: metricId, 
        startTime: Date.now() 
      });

      return metricId;
    } catch (error) {
      console.error('Error in startMetric:', error);
      return '';
    }
  }

  // End tracking a performance metric
  static async endMetric(
    metricId: string,
    agentId: string,
    phase: string,
    result: {
      outputSize?: number;
      itemsProcessed?: number;
      successRate?: number;
      errorMessage?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<boolean> {
    try {
      const key = `${agentId}-${phase}`;
      const activeMetric = this.activeMetrics.get(key);
      
      if (!activeMetric) {
        console.warn('No active metric found for', key);
        return false;
      }

      const durationMs = Date.now() - activeMetric.startTime;
      const endTime = new Date().toISOString();

      const { error } = await supabase
        .from('crawl_performance_metrics')
        .update({
          end_time: endTime,
          duration_ms: durationMs,
          output_size: result.outputSize,
          items_processed: result.itemsProcessed,
          success_rate: result.successRate,
          error_message: result.errorMessage,
          metadata: result.metadata
        })
        .eq('id', metricId);

      if (error) {
        console.error('Error ending metric:', error);
        return false;
      }

      this.activeMetrics.delete(key);
      return true;
    } catch (error) {
      console.error('Error in endMetric:', error);
      return false;
    }
  }

  // Record a complete metric in one call
  static async recordMetric(input: MetricInput & {
    durationMs: number;
  }): Promise<boolean> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - input.durationMs);

      const { error } = await supabase
        .from('crawl_performance_metrics')
        .insert({
          source_id: input.sourceId,
          agent_id: input.agentId,
          team_id: input.teamId,
          phase: input.phase,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration_ms: input.durationMs,
          input_size: input.inputSize,
          output_size: input.outputSize,
          items_processed: input.itemsProcessed,
          success_rate: input.successRate,
          error_message: input.errorMessage,
          metadata: input.metadata || {}
        });

      if (error) {
        console.error('Error recording metric:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in recordMetric:', error);
      return false;
    }
  }

  // Get metrics for an agent
  static async getAgentMetrics(
    agentId: string,
    timeRange?: { from: Date; to: Date }
  ): Promise<PerformanceMetrics[]> {
    try {
      let query = supabase
        .from('crawl_performance_metrics')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (timeRange) {
        query = query
          .gte('created_at', timeRange.from.toISOString())
          .lte('created_at', timeRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting agent metrics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAgentMetrics:', error);
      return [];
    }
  }

  // Get aggregated metrics by phase
  static async getAggregatedMetrics(
    agentId: string,
    timeRange?: { from: Date; to: Date }
  ): Promise<AggregatedMetrics[]> {
    try {
      let query = supabase
        .from('crawl_performance_metrics')
        .select('*')
        .eq('agent_id', agentId)
        .not('duration_ms', 'is', null);

      if (timeRange) {
        query = query
          .gte('created_at', timeRange.from.toISOString())
          .lte('created_at', timeRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting aggregated metrics:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Group by phase and calculate aggregations
      const groupedMetrics: Record<string, any[]> = {};
      data.forEach(metric => {
        if (!groupedMetrics[metric.phase]) {
          groupedMetrics[metric.phase] = [];
        }
        groupedMetrics[metric.phase].push(metric);
      });

      const aggregated: AggregatedMetrics[] = [];

      Object.entries(groupedMetrics).forEach(([phase, metrics]) => {
        const totalDuration = metrics.reduce((sum, m) => sum + (m.duration_ms || 0), 0);
        const avgDuration = totalDuration / metrics.length;
        
        const totalInputSize = metrics.reduce((sum, m) => sum + (m.input_size || 0), 0);
        const totalOutputSize = metrics.reduce((sum, m) => sum + (m.output_size || 0), 0);
        const totalItemsProcessed = metrics.reduce((sum, m) => sum + (m.items_processed || 0), 0);
        
        const successRates = metrics.filter(m => m.success_rate !== null).map(m => m.success_rate);
        const avgSuccessRate = successRates.length > 0 
          ? successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length 
          : 1.0;

        const compressionRatio = totalInputSize > 0 ? totalOutputSize / totalInputSize : 1.0;
        const throughputPerSecond = totalDuration > 0 ? (totalItemsProcessed * 1000) / totalDuration : 0;

        aggregated.push({
          phase,
          avgDurationMs: avgDuration,
          totalInputSize,
          totalOutputSize,
          totalItemsProcessed,
          avgSuccessRate,
          compressionRatio,
          throughputPerSecond
        });
      });

      return aggregated;
    } catch (error) {
      console.error('Error in getAggregatedMetrics:', error);
      return [];
    }
  }

  // Get system-wide performance overview
  static async getSystemOverview(teamId: string): Promise<{
    totalSources: number;
    totalChunks: number;
    avgProcessingTime: number;
    compressionRatio: number;
    errorRate: number;
  }> {
    try {
      const { data: metrics, error } = await supabase
        .from('crawl_performance_metrics')
        .select('*')
        .eq('team_id', teamId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (error) {
        console.error('Error getting system overview:', error);
        return {
          totalSources: 0,
          totalChunks: 0,
          avgProcessingTime: 0,
          compressionRatio: 0,
          errorRate: 0
        };
      }

      const extractionMetrics = metrics?.filter(m => m.phase === 'extraction') || [];
      const chunkingMetrics = metrics?.filter(m => m.phase === 'chunking') || [];

      const totalSources = extractionMetrics.length;
      const totalChunks = chunkingMetrics.reduce((sum, m) => sum + (m.items_processed || 0), 0);
      
      const avgProcessingTime = extractionMetrics.length > 0
        ? extractionMetrics.reduce((sum, m) => sum + (m.duration_ms || 0), 0) / extractionMetrics.length
        : 0;

      const totalInputSize = extractionMetrics.reduce((sum, m) => sum + (m.input_size || 0), 0);
      const totalOutputSize = extractionMetrics.reduce((sum, m) => sum + (m.output_size || 0), 0);
      const compressionRatio = totalInputSize > 0 ? totalOutputSize / totalInputSize : 0;

      const metricsWithErrors = metrics?.filter(m => m.error_message) || [];
      const errorRate = metrics?.length > 0 ? metricsWithErrors.length / metrics.length : 0;

      return {
        totalSources,
        totalChunks,
        avgProcessingTime,
        compressionRatio,
        errorRate
      };
    } catch (error) {
      console.error('Error in getSystemOverview:', error);
      return {
        totalSources: 0,
        totalChunks: 0,
        avgProcessingTime: 0,
        compressionRatio: 0,
        errorRate: 0
      };
    }
  }
}
