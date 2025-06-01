
import { supabase } from "@/integrations/supabase/client";

export interface ConnectionPoolConfig {
  poolName: string;
  minConnections: number;
  maxConnections: number;
  connectionTimeoutMs: number;
  idleTimeoutMs: number;
  maxLifetimeMs: number;
}

export interface PoolMetrics {
  poolName: string;
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  queuedRequests: number;
  avgResponseTime: number;
  errorRate: number;
}

export class ConnectionPoolManager {
  private static pools: Map<string, ConnectionPoolConfig> = new Map();
  private static metrics: Map<string, PoolMetrics> = new Map();

  // Initialize connection pools based on database configuration
  static async initializePools(): Promise<void> {
    console.log('🔗 Initializing database connection pools...');

    const { data: poolConfigs, error } = await supabase
      .from('connection_pool_config')
      .select('*');

    if (error) {
      console.error('Failed to fetch pool configurations:', error);
      return;
    }

    poolConfigs?.forEach(config => {
      this.pools.set(config.pool_name, {
        poolName: config.pool_name,
        minConnections: config.min_connections,
        maxConnections: config.max_connections,
        connectionTimeoutMs: config.connection_timeout_ms,
        idleTimeoutMs: config.idle_timeout_ms,
        maxLifetimeMs: config.max_lifetime_ms
      });

      // Initialize metrics
      this.metrics.set(config.pool_name, {
        poolName: config.pool_name,
        activeConnections: 0,
        idleConnections: config.min_connections,
        totalConnections: config.min_connections,
        queuedRequests: 0,
        avgResponseTime: 0,
        errorRate: 0
      });
    });

    console.log(`✅ Initialized ${this.pools.size} connection pools`);
  }

  // Get optimal pool for customer based on load distribution
  static async getOptimalPool(customerId: string): Promise<string> {
    // Check if customer has an assigned pool
    const { data: customerDistribution } = await supabase
      .from('customer_load_distribution')
      .select('worker_pool')
      .eq('customer_id', customerId)
      .single();

    if (customerDistribution) {
      return customerDistribution.worker_pool;
    }

    // Assign customer to optimal pool
    const { data: assignmentResult } = await supabase
      .rpc('assign_customer_to_pool', { target_customer_id: customerId });

    if (assignmentResult && typeof assignmentResult === 'object') {
      const result = assignmentResult as any;
      return result.worker_pool || 'standard';
    }

    return 'standard'; // Default fallback
  }

  // Update pool configuration
  static async updatePoolConfig(
    poolName: string, 
    config: Partial<ConnectionPoolConfig>
  ): Promise<void> {
    const currentConfig = this.pools.get(poolName);
    if (!currentConfig) {
      throw new Error(`Pool ${poolName} not found`);
    }

    const updatedConfig = { ...currentConfig, ...config };
    this.pools.set(poolName, updatedConfig);

    // Update in database
    const { error } = await supabase
      .from('connection_pool_config')
      .update({
        min_connections: updatedConfig.minConnections,
        max_connections: updatedConfig.maxConnections,
        connection_timeout_ms: updatedConfig.connectionTimeoutMs,
        idle_timeout_ms: updatedConfig.idleTimeoutMs,
        max_lifetime_ms: updatedConfig.maxLifetimeMs,
        updated_at: new Date().toISOString()
      })
      .eq('pool_name', poolName);

    if (error) {
      throw new Error(`Failed to update pool config: ${error.message}`);
    }

    console.log(`🔧 Updated pool configuration for ${poolName}`);
  }

  // Get pool metrics
  static getPoolMetrics(poolName?: string): PoolMetrics | PoolMetrics[] {
    if (poolName) {
      const metrics = this.metrics.get(poolName);
      if (!metrics) {
        throw new Error(`Pool ${poolName} not found`);
      }
      return metrics;
    }

    return Array.from(this.metrics.values());
  }

  // Update pool metrics (would be called by actual connection pool implementation)
  static updatePoolMetrics(poolName: string, metrics: Partial<PoolMetrics>): void {
    const currentMetrics = this.metrics.get(poolName);
    if (!currentMetrics) {
      return;
    }

    this.metrics.set(poolName, { ...currentMetrics, ...metrics });
  }

  // Scale pool based on load
  static async scalePool(poolName: string, direction: 'up' | 'down'): Promise<void> {
    const config = this.pools.get(poolName);
    const metrics = this.metrics.get(poolName);

    if (!config || !metrics) {
      throw new Error(`Pool ${poolName} not found`);
    }

    let newMaxConnections = config.maxConnections;

    if (direction === 'up') {
      // Scale up by 50% but cap at 500 connections
      newMaxConnections = Math.min(Math.ceil(config.maxConnections * 1.5), 500);
    } else {
      // Scale down by 25% but maintain minimum
      newMaxConnections = Math.max(Math.ceil(config.maxConnections * 0.75), config.minConnections);
    }

    if (newMaxConnections !== config.maxConnections) {
      await this.updatePoolConfig(poolName, { maxConnections: newMaxConnections });
      console.log(`📈 Scaled ${poolName} ${direction}: ${config.maxConnections} -> ${newMaxConnections} connections`);
    }
  }

  // Get pool health status
  static getPoolHealth(): {
    healthy: string[];
    degraded: string[];
    critical: string[];
  } {
    const healthy: string[] = [];
    const degraded: string[] = [];
    const critical: string[] = [];

    this.metrics.forEach((metrics, poolName) => {
      const utilizationRate = metrics.activeConnections / (metrics.totalConnections || 1);
      const errorRate = metrics.errorRate;

      if (errorRate > 0.1 || utilizationRate > 0.9) {
        critical.push(poolName);
      } else if (errorRate > 0.05 || utilizationRate > 0.7) {
        degraded.push(poolName);
      } else {
        healthy.push(poolName);
      }
    });

    return { healthy, degraded, critical };
  }

  // Load balance customer requests
  static async distributeCustomerLoad(
    customerId: string, 
    estimatedLoad: number
  ): Promise<{ poolName: string; partitionId: number }> {
    // Get current customer assignment
    const { data: currentAssignment } = await supabase
      .from('customer_load_distribution')
      .select('*')
      .eq('customer_id', customerId)
      .single();

    if (currentAssignment) {
      // Update current load
      await supabase
        .from('customer_load_distribution')
        .update({
          current_load: currentAssignment.current_load + estimatedLoad,
          last_assigned_at: new Date().toISOString()
        })
        .eq('customer_id', customerId);

      return {
        poolName: currentAssignment.worker_pool,
        partitionId: currentAssignment.partition_id
      };
    }

    // Assign to optimal pool
    const { data: assignmentResult } = await supabase
      .rpc('assign_customer_to_pool', { target_customer_id: customerId });

    if (assignmentResult && typeof assignmentResult === 'object') {
      const result = assignmentResult as any;
      return {
        poolName: result.worker_pool || 'standard',
        partitionId: result.partition_id || 0
      };
    }

    return { poolName: 'standard', partitionId: 0 };
  }
}
