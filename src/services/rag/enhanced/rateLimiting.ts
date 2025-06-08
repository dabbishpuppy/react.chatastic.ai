
import { RealRateLimitingService } from './realRateLimitingService';

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  enabled: boolean;
}

export interface RateLimitStatus {
  allowed: boolean;
  remainingRequests: number;
  resetTime: Date;
  currentUsage: {
    minute: number;
    hour: number;
    day: number;
    concurrent: number;
  };
}

export class RateLimitingService {
  // Default rate limits
  private static readonly DEFAULT_CONFIG: RateLimitConfig = {
    requestsPerMinute: 60,
    requestsPerHour: 1000, 
    requestsPerDay: 10000,
    burstLimit: 20,
    enabled: true
  };

  /**
   * Check if a request is allowed for the given customer
   */
  static async checkRateLimit(customerId: string): Promise<RateLimitStatus> {
    try {
      console.log(`🔍 Checking rate limit for customer: ${customerId}`);
      
      // Use the real rate limiting service
      const result = await RealRateLimitingService.checkRateLimit(customerId);
      
      return {
        allowed: result.allowed,
        remainingRequests: result.remainingRequests,
        resetTime: result.resetTime,
        currentUsage: result.currentUsage
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      
      // Fail open - allow the request if rate limiting fails
      return {
        allowed: true,
        remainingRequests: 100,
        resetTime: new Date(Date.now() + 60000),
        currentUsage: { minute: 0, hour: 0, day: 0, concurrent: 0 }
      };
    }
  }

  /**
   * Handle rate limiting for crawl requests
   */
  static async handleCrawlRateLimit(
    customerId: string,
    requestFn: () => Promise<any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Check rate limits before processing
      const rateLimitCheck = await this.checkRateLimit(customerId);
      
      if (!rateLimitCheck.allowed) {
        console.warn(`🚫 Rate limit exceeded for customer ${customerId}`);
        return {
          success: false,
          error: `Rate limit exceeded. Please wait ${Math.ceil((rateLimitCheck.resetTime.getTime() - Date.now()) / 1000)} seconds before trying again.`
        };
      }

      // Execute the request
      const data = await requestFn();
      
      console.log(`✅ Request completed for customer ${customerId}`);
      return { success: true, data };

    } catch (error) {
      console.error('Request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed'
      };
    }
  }

  /**
   * Get rate limit configuration for a customer
   */
  static async getRateLimitConfig(customerId: string): Promise<RateLimitConfig> {
    try {
      // For now, return default config
      // In production, this would fetch customer-specific limits
      return { ...this.DEFAULT_CONFIG };
    } catch (error) {
      console.error('Failed to get rate limit config:', error);
      return { ...this.DEFAULT_CONFIG };
    }
  }

  /**
   * Update rate limit configuration for a customer
   */
  static async updateRateLimitConfig(
    customerId: string, 
    config: Partial<RateLimitConfig>
  ): Promise<boolean> {
    try {
      console.log(`📝 Updating rate limit config for customer: ${customerId}`);
      
      // In production, this would update the customer's rate limit configuration
      // For now, we'll just log the update
      console.log('New config:', config);
      
      return true;
    } catch (error) {
      console.error('Failed to update rate limit config:', error);
      return false;
    }
  }

  /**
   * Get current usage statistics for a customer
   */
  static async getUsageStats(customerId: string): Promise<{
    currentUsage: {
      minute: number;
      hour: number;
      day: number;
      concurrent: number;
    };
    limits: RateLimitConfig;
    utilizationPercentage: number;
  }> {
    try {
      const rateLimitStatus = await this.checkRateLimit(customerId);
      const config = await this.getRateLimitConfig(customerId);
      
      // Calculate utilization based on the most restrictive limit
      const utilizationPercentage = Math.max(
        (rateLimitStatus.currentUsage.minute / config.requestsPerMinute) * 100,
        (rateLimitStatus.currentUsage.hour / config.requestsPerHour) * 100,
        (rateLimitStatus.currentUsage.day / config.requestsPerDay) * 100,
        (rateLimitStatus.currentUsage.concurrent / config.burstLimit) * 100
      );

      return {
        currentUsage: rateLimitStatus.currentUsage,
        limits: config,
        utilizationPercentage: Math.round(utilizationPercentage)
      };
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      return {
        currentUsage: { minute: 0, hour: 0, day: 0, concurrent: 0 },
        limits: this.DEFAULT_CONFIG,
        utilizationPercentage: 0
      };
    }
  }

  /**
   * Track concurrent requests for a customer
   */
  static async trackConcurrentRequest<T>(
    customerId: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    try {
      // Increment concurrent request counter
      await RealRateLimitingService.decrementConcurrentRequests(customerId);
      
      try {
        // Execute the request
        const result = await requestFn();
        return result;
      } finally {
        // Always decrement the counter, even if the request fails
        await RealRateLimitingService.decrementConcurrentRequests(customerId);
      }
    } catch (error) {
      console.error('Failed to track concurrent request:', error);
      throw error;
    }
  }

  /**
   * Reset rate limits for a customer (admin function)
   */
  static async resetCustomerLimits(customerId: string): Promise<boolean> {
    try {
      console.log(`🔄 Resetting rate limits for customer: ${customerId}`);
      
      const success = await RealRateLimitingService.resetCustomerLimits(customerId);
      
      if (success) {
        console.log(`✅ Rate limits reset for customer: ${customerId}`);
      } else {
        console.error(`❌ Failed to reset rate limits for customer: ${customerId}`);
      }
      
      return success;
    } catch (error) {
      console.error('Failed to reset customer limits:', error);
      return false;
    }
  }

  /**
   * Get rate limiting health status
   */
  static async getHealthStatus(): Promise<{
    healthy: boolean;
    totalCustomers: number;
    activeRequests: number;
    issues: string[];
  }> {
    try {
      const stats = await RealRateLimitingService.getRateLimitStats();
      
      const issues: string[] = [];
      
      // Check for potential issues
      if (stats.activeRequests > 1000) {
        issues.push('High number of active requests detected');
      }
      
      if (stats.throttledRequests > stats.totalCustomers * 10) {
        issues.push('High rate of throttled requests detected');
      }
      
      return {
        healthy: issues.length === 0,
        totalCustomers: stats.totalCustomers,
        activeRequests: stats.activeRequests,
        issues
      };
    } catch (error) {
      console.error('Failed to get health status:', error);
      return {
        healthy: false,
        totalCustomers: 0,
        activeRequests: 0,
        issues: ['Failed to check rate limiting health']
      };
    }
  }
}

// Re-export types for convenience
export type { RateLimitStatus as RateLimitResult };
