import { IPPoolService } from "./ipPoolService";
import { AlertingService } from "./alertingService";

export interface EgressRequest {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  retries?: number;
  priority: 'low' | 'normal' | 'high';
  customerId: string;
  sourceType: 'crawl' | 'api' | 'bulk'; // Fixed: changed 'webhook' to 'bulk';
}

export interface EgressResponse {
  success: boolean;
  statusCode?: number;
  data?: string;
  headers?: Record<string, string>;
  error?: string;
  poolUsed?: string;
  responseTime: number;
  bytesTransferred: number;
  retryCount: number;
}

export interface RateLimitConfig {
  customerId: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  concurrentLimit: number;
}

export interface EgressMetrics {
  timestamp: string;
  customerId: string;
  poolId: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  avgResponseTime: number;
  totalBytesTransferred: number;
  rateLimitHits: number;
}

export class EgressManagementService {
  private static rateLimits: Map<string, RateLimitConfig> = new Map();
  private static requestCounters: Map<string, { minute: number; hour: number; day: number; timestamp: number }> = new Map();
  private static egressMetrics: EgressMetrics[] = [];
  private static activeRequests: Map<string, number> = new Map(); // Track concurrent requests per customer

  // Initialize egress management
  static initialize(): void {
    console.log('🌐 Initializing egress management service...');

    // Set default rate limits
    this.setDefaultRateLimits();

    // Start monitoring
    setInterval(() => this.collectEgressMetrics(), 60000); // Every minute
    setInterval(() => this.resetCounters(), 60000); // Reset counters every minute
    setInterval(() => this.cleanupOldMetrics(), 3600000); // Cleanup every hour

    console.log('✅ Egress management service initialized');
  }

  // Execute request through egress management
  static async executeRequest(request: EgressRequest): Promise<EgressResponse> {
    const startTime = Date.now();
    
    try {
      // Check rate limits
      const rateLimitCheck = await this.checkRateLimit(request.customerId, request.priority);
      if (!rateLimitCheck.allowed) {
        await this.recordRateLimitHit(request.customerId);
        return {
          success: false,
          error: `Rate limit exceeded: ${rateLimitCheck.reason}`,
          responseTime: Date.now() - startTime,
          bytesTransferred: 0,
          retryCount: 0
        };
      }

      // Select optimal IP pool
      const pool = await IPPoolService.selectOptimalPool(request.url, request.sourceType);
      if (!pool) {
        return {
          success: false,
          error: 'No available IP pools',
          responseTime: Date.now() - startTime,
          bytesTransferred: 0,
          retryCount: 0
        };
      }

      // Track concurrent requests
      this.incrementConcurrentRequests(request.customerId);

      try {
        // Execute the actual request
        const response = await this.performRequest(request, pool.ipAddresses[0]);
        
        // Record metrics
        await this.recordEgressMetrics(request.customerId, pool.id, response);
        
        return response;
      } finally {
        this.decrementConcurrentRequests(request.customerId);
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
        bytesTransferred: 0,
        retryCount: 0
      };
    }
  }

  // Perform the actual HTTP request
  private static async performRequest(
    request: EgressRequest, 
    sourceIP: string
  ): Promise<EgressResponse> {
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = request.retries || 3;

    while (retryCount <= maxRetries) {
      try {
        console.log(`🌐 Executing request to ${request.url} via IP ${sourceIP} (attempt ${retryCount + 1})`);

        // In a real implementation, this would use the source IP for the request
        // For now, we'll simulate the request
        const response = await fetch(request.url, {
          method: request.method,
          headers: {
            ...request.headers,
            'User-Agent': 'WonderWave-Egress-Bot/1.0',
            'X-Source-IP': sourceIP
          },
          body: request.body,
          signal: AbortSignal.timeout(request.timeout || 30000)
        });

        const data = await response.text();
        const responseTime = Date.now() - startTime;
        const bytesTransferred = data.length;

        if (response.ok) {
          console.log(`✅ Request successful: ${response.status} (${responseTime}ms, ${bytesTransferred} bytes)`);
          
          return {
            success: true,
            statusCode: response.status,
            data,
            headers: Object.fromEntries(response.headers.entries()),
            poolUsed: sourceIP,
            responseTime,
            bytesTransferred,
            retryCount
          };
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

      } catch (error) {
        retryCount++;
        const isLastAttempt = retryCount > maxRetries;
        
        console.warn(`❌ Request failed (attempt ${retryCount}): ${error instanceof Error ? error.message : error}`);
        
        if (isLastAttempt) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            responseTime: Date.now() - startTime,
            bytesTransferred: 0,
            retryCount
          };
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but TypeScript requires it
    return {
      success: false,
      error: 'Max retries exceeded',
      responseTime: Date.now() - startTime,
      bytesTransferred: 0,
      retryCount
    };
  }

  // Check rate limits for a customer
  private static async checkRateLimit(
    customerId: string, 
    priority: 'low' | 'normal' | 'high'
  ): Promise<{ allowed: boolean; reason?: string }> {
    const rateLimitConfig = this.rateLimits.get(customerId);
    if (!rateLimitConfig) {
      // Apply default rate limits
      await this.applyDefaultRateLimit(customerId);
      return { allowed: true };
    }

    const counters = this.getOrCreateCounters(customerId);
    const concurrentRequests = this.activeRequests.get(customerId) || 0;

    // Check concurrent limit
    if (concurrentRequests >= rateLimitConfig.concurrentLimit) {
      return { allowed: false, reason: 'Concurrent request limit exceeded' };
    }

    // Priority-based multipliers
    const priorityMultiplier = priority === 'high' ? 2 : priority === 'low' ? 0.5 : 1;

    // Check per-minute limit
    if (counters.minute >= rateLimitConfig.requestsPerMinute * priorityMultiplier) {
      return { allowed: false, reason: 'Per-minute rate limit exceeded' };
    }

    // Check per-hour limit
    if (counters.hour >= rateLimitConfig.requestsPerHour * priorityMultiplier) {
      return { allowed: false, reason: 'Per-hour rate limit exceeded' };
    }

    // Check per-day limit
    if (counters.day >= rateLimitConfig.requestsPerDay * priorityMultiplier) {
      return { allowed: false, reason: 'Daily rate limit exceeded' };
    }

    // Increment counters
    counters.minute++;
    counters.hour++;
    counters.day++;

    return { allowed: true };
  }

  // Set default rate limits for different customer types
  private static setDefaultRateLimits(): void {
    const defaultConfig: RateLimitConfig = {
      customerId: 'default',
      requestsPerMinute: 100,
      requestsPerHour: 5000,
      requestsPerDay: 50000,
      burstLimit: 200,
      concurrentLimit: 50
    };

    this.rateLimits.set('default', defaultConfig);
  }

  // Apply default rate limit to a customer
  private static async applyDefaultRateLimit(customerId: string): Promise<void> {
    const defaultConfig = this.rateLimits.get('default');
    if (defaultConfig) {
      this.rateLimits.set(customerId, { ...defaultConfig, customerId });
    }
  }

  // Get or create request counters for a customer
  private static getOrCreateCounters(customerId: string) {
    const existing = this.requestCounters.get(customerId);
    const now = Date.now();
    
    if (!existing || now - existing.timestamp > 60000) {
      // Reset counters if they're old
      const newCounters = { minute: 0, hour: 0, day: 0, timestamp: now };
      this.requestCounters.set(customerId, newCounters);
      return newCounters;
    }
    
    return existing;
  }

  // Track concurrent requests
  private static incrementConcurrentRequests(customerId: string): void {
    const current = this.activeRequests.get(customerId) || 0;
    this.activeRequests.set(customerId, current + 1);
  }

  private static decrementConcurrentRequests(customerId: string): void {
    const current = this.activeRequests.get(customerId) || 0;
    this.activeRequests.set(customerId, Math.max(0, current - 1));
  }

  // Record rate limit hit
  private static async recordRateLimitHit(customerId: string): Promise<void> {
    console.warn(`🚫 Rate limit hit for customer ${customerId}`);
    
    // Create alert for excessive rate limiting
    const recentHits = this.egressMetrics
      .filter(m => m.customerId === customerId && Date.now() - new Date(m.timestamp).getTime() < 300000)
      .reduce((sum, m) => sum + m.rateLimitHits, 0);

    if (recentHits > 10) {
      await AlertingService.createAlert(
        'high_rate_limit_usage',
        `Customer ${customerId} has hit rate limits ${recentHits} times in the last 5 minutes`,
        'medium'
      );
    }
  }

  // Record egress metrics
  private static async recordEgressMetrics(
    customerId: string, 
    poolId: string, 
    response: EgressResponse
  ): Promise<void> {
    const metrics: EgressMetrics = {
      timestamp: new Date().toISOString(),
      customerId,
      poolId,
      requestCount: 1,
      successCount: response.success ? 1 : 0,
      errorCount: response.success ? 0 : 1,
      avgResponseTime: response.responseTime,
      totalBytesTransferred: response.bytesTransferred,
      rateLimitHits: 0
    };

    this.egressMetrics.push(metrics);
  }

  // Collect and aggregate egress metrics
  private static collectEgressMetrics(): void {
    // Aggregate metrics by customer and pool
    const aggregated = new Map<string, EgressMetrics>();

    this.egressMetrics
      .filter(m => Date.now() - new Date(m.timestamp).getTime() < 60000) // Last minute
      .forEach(metric => {
        const key = `${metric.customerId}-${metric.poolId}`;
        const existing = aggregated.get(key);

        if (existing) {
          existing.requestCount += metric.requestCount;
          existing.successCount += metric.successCount;
          existing.errorCount += metric.errorCount;
          existing.avgResponseTime = (existing.avgResponseTime + metric.avgResponseTime) / 2;
          existing.totalBytesTransferred += metric.totalBytesTransferred;
          existing.rateLimitHits += metric.rateLimitHits;
        } else {
          aggregated.set(key, { ...metric });
        }
      });

    console.log(`📊 Collected egress metrics for ${aggregated.size} customer-pool combinations`);
  }

  // Reset request counters
  private static resetCounters(): void {
    const now = Date.now();
    
    for (const [customerId, counters] of this.requestCounters.entries()) {
      const timeDiff = now - counters.timestamp;
      
      // Reset minute counter every minute
      if (timeDiff >= 60000) {
        counters.minute = 0;
        counters.timestamp = now;
      }
      
      // Reset hour counter every hour
      if (timeDiff >= 3600000) {
        counters.hour = 0;
      }
      
      // Reset day counter every day
      if (timeDiff >= 86400000) {
        counters.day = 0;
      }
    }
  }

  // Cleanup old metrics
  private static cleanupOldMetrics(): void {
    const cutoff = Date.now() - 86400000; // 24 hours ago
    const originalLength = this.egressMetrics.length;
    
    this.egressMetrics = this.egressMetrics.filter(m => 
      new Date(m.timestamp).getTime() > cutoff
    );

    const removed = originalLength - this.egressMetrics.length;
    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} old egress metrics`);
    }
  }

  // Get egress status and metrics
  static getEgressStatus(): {
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    activeCustomers: number;
    rateLimitHits: number;
    topCustomersByUsage: Array<{ customerId: string; requests: number }>;
    poolUsage: Array<{ poolId: string; requests: number; successRate: number }>;
  } {
    const recent = this.egressMetrics.filter(m => 
      Date.now() - new Date(m.timestamp).getTime() < 3600000 // Last hour
    );

    const totalRequests = recent.reduce((sum, m) => sum + m.requestCount, 0);
    const totalSuccess = recent.reduce((sum, m) => sum + m.successCount, 0);
    const totalResponseTime = recent.reduce((sum, m) => sum + m.avgResponseTime, 0);
    const rateLimitHits = recent.reduce((sum, m) => sum + m.rateLimitHits, 0);

    const successRate = totalRequests > 0 ? (totalSuccess / totalRequests) * 100 : 0;
    const avgResponseTime = recent.length > 0 ? totalResponseTime / recent.length : 0;

    // Top customers by usage
    const customerUsage = new Map<string, number>();
    recent.forEach(m => {
      customerUsage.set(m.customerId, (customerUsage.get(m.customerId) || 0) + m.requestCount);
    });

    const topCustomersByUsage = Array.from(customerUsage.entries())
      .map(([customerId, requests]) => ({ customerId, requests }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    // Pool usage
    const poolUsage = new Map<string, { requests: number; success: number }>();
    recent.forEach(m => {
      const existing = poolUsage.get(m.poolId) || { requests: 0, success: 0 };
      existing.requests += m.requestCount;
      existing.success += m.successCount;
      poolUsage.set(m.poolId, existing);
    });

    const poolUsageArray = Array.from(poolUsage.entries())
      .map(([poolId, data]) => ({
        poolId,
        requests: data.requests,
        successRate: data.requests > 0 ? (data.success / data.requests) * 100 : 0
      }));

    return {
      totalRequests,
      successRate: Math.round(successRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      activeCustomers: new Set(recent.map(m => m.customerId)).size,
      rateLimitHits,
      topCustomersByUsage,
      poolUsage: poolUsageArray
    };
  }

  // Update rate limits for a customer
  static updateRateLimit(customerId: string, config: Partial<RateLimitConfig>): void {
    const existing = this.rateLimits.get(customerId) || this.rateLimits.get('default')!;
    const updated = { ...existing, ...config, customerId };
    
    this.rateLimits.set(customerId, updated);
    console.log(`🔧 Updated rate limits for customer ${customerId}`);
  }

  // Get rate limit status for a customer
  static getRateLimitStatus(customerId: string): {
    config: RateLimitConfig;
    current: { minute: number; hour: number; day: number; concurrent: number };
    remaining: { minute: number; hour: number; day: number };
  } {
    const config = this.rateLimits.get(customerId) || this.rateLimits.get('default')!;
    const counters = this.getOrCreateCounters(customerId);
    const concurrent = this.activeRequests.get(customerId) || 0;

    return {
      config,
      current: {
        minute: counters.minute,
        hour: counters.hour,
        day: counters.day,
        concurrent
      },
      remaining: {
        minute: Math.max(0, config.requestsPerMinute - counters.minute),
        hour: Math.max(0, config.requestsPerHour - counters.hour),
        day: Math.max(0, config.requestsPerDay - counters.day)
      }
    };
  }
}
