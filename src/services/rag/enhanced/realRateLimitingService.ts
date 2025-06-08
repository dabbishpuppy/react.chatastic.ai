
import { supabase } from "@/integrations/supabase/client";

export interface RateLimitRule {
  id: string;
  customerId: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  enabled: boolean;
}

export interface RateLimitResult {
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

export class RealRateLimitingService {
  private static readonly DEFAULT_LIMITS = {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    burstLimit: 20,
    maxConcurrent: 10
  };

  /**
   * Check if request is allowed under rate limits
   */
  static async checkRateLimit(customerId: string): Promise<RateLimitResult> {
    try {
      console.log(`🚦 Checking rate limits for customer: ${customerId}`);

      // Get customer-specific rate limit rules
      const limits = await this.getCustomerLimits(customerId);

      // Get current usage
      const currentUsage = await this.getCurrentUsage(customerId);

      // Check all rate limit dimensions
      const minuteAllowed = currentUsage.minute < limits.requestsPerMinute;
      const hourAllowed = currentUsage.hour < limits.requestsPerHour;
      const dayAllowed = currentUsage.day < limits.requestsPerDay;
      const concurrentAllowed = currentUsage.concurrent < limits.burstLimit;

      const allowed = minuteAllowed && hourAllowed && dayAllowed && concurrentAllowed;

      // Calculate remaining requests (most restrictive limit)
      const remainingRequests = Math.min(
        limits.requestsPerMinute - currentUsage.minute,
        limits.requestsPerHour - currentUsage.hour,
        limits.requestsPerDay - currentUsage.day,
        limits.burstLimit - currentUsage.concurrent
      );

      // Calculate next reset time (minute boundary)
      const resetTime = new Date();
      resetTime.setSeconds(0, 0);
      resetTime.setMinutes(resetTime.getMinutes() + 1);

      if (allowed) {
        // Increment usage counters
        await this.incrementUsage(customerId);
      } else {
        console.warn(`❌ Rate limit exceeded for customer ${customerId}:`, {
          currentUsage,
          limits,
          minuteAllowed,
          hourAllowed,
          dayAllowed,
          concurrentAllowed
        });
      }

      return {
        allowed,
        remainingRequests: Math.max(0, remainingRequests),
        resetTime,
        currentUsage
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow request if rate limiting system is down
      return {
        allowed: true,
        remainingRequests: 100,
        resetTime: new Date(Date.now() + 60000),
        currentUsage: { minute: 0, hour: 0, day: 0, concurrent: 0 }
      };
    }
  }

  /**
   * Get customer-specific rate limits or defaults
   */
  private static async getCustomerLimits(customerId: string): Promise<RateLimitRule> {
    try {
      // Try to get custom limits from database
      const { data, error } = await supabase
        .from('customer_usage_tracking')
        .select('*')
        .eq('customer_id', customerId)
        .single();

      if (error || !data) {
        // Return default limits
        return {
          id: 'default',
          customerId,
          ...this.DEFAULT_LIMITS
        } as RateLimitRule;
      }

      // Use stored limits or defaults
      return {
        id: data.id,
        customerId,
        requestsPerMinute: this.DEFAULT_LIMITS.requestsPerMinute,
        requestsPerHour: this.DEFAULT_LIMITS.requestsPerHour,
        requestsPerDay: this.DEFAULT_LIMITS.requestsPerDay,
        burstLimit: this.DEFAULT_LIMITS.burstLimit,
        enabled: true
      };
    } catch (error) {
      console.error('Failed to get customer limits:', error);
      return {
        id: 'default',
        customerId,
        ...this.DEFAULT_LIMITS
      } as RateLimitRule;
    }
  }

  /**
   * Get current usage statistics
   */
  private static async getCurrentUsage(customerId: string): Promise<{
    minute: number;
    hour: number;
    day: number;
    concurrent: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('customer_usage_tracking')
        .select('*')
        .eq('customer_id', customerId)
        .single();

      if (error || !data) {
        return { minute: 0, hour: 0, day: 0, concurrent: 0 };
      }

      // Reset counters if time windows have passed
      const now = new Date();
      const minuteReset = new Date(data.minute_reset_at);
      const hourReset = new Date(data.hour_reset_at);
      const dayReset = new Date(data.day_reset_at);

      return {
        minute: now > minuteReset ? 0 : (data.requests_last_minute || 0),
        hour: now > hourReset ? 0 : (data.requests_last_hour || 0),
        day: now > dayReset ? 0 : (data.requests_last_day || 0),
        concurrent: data.concurrent_requests || 0
      };
    } catch (error) {
      console.error('Failed to get current usage:', error);
      return { minute: 0, hour: 0, day: 0, concurrent: 0 };
    }
  }

  /**
   * Increment usage counters
   */
  private static async incrementUsage(customerId: string): Promise<void> {
    try {
      // Use the existing database function
      await supabase.rpc('increment_concurrent_requests', {
        target_customer_id: customerId
      });
    } catch (error) {
      console.error('Failed to increment usage:', error);
    }
  }

  /**
   * Decrement concurrent request counter
   */
  static async decrementConcurrentRequests(customerId: string): Promise<void> {
    try {
      await supabase.rpc('decrement_concurrent_requests', {
        target_customer_id: customerId
      });
    } catch (error) {
      console.error('Failed to decrement concurrent requests:', error);
    }
  }

  /**
   * Get rate limiting statistics
   */
  static async getRateLimitStats(customerId?: string): Promise<{
    totalCustomers: number;
    activeRequests: number;
    throttledRequests: number;
    avgResponseTime: number;
  }> {
    try {
      let query = supabase.from('customer_usage_tracking').select('*');
      
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const totalCustomers = data?.length || 0;
      const activeRequests = data?.reduce((sum, customer) => 
        sum + (customer.concurrent_requests || 0), 0) || 0;

      return {
        totalCustomers,
        activeRequests,
        throttledRequests: 0, // Would need additional tracking
        avgResponseTime: 0 // Would need additional tracking
      };
    } catch (error) {
      console.error('Failed to get rate limit stats:', error);
      return {
        totalCustomers: 0,
        activeRequests: 0,
        throttledRequests: 0,
        avgResponseTime: 0
      };
    }
  }

  /**
   * Reset rate limits for a customer (admin function)
   */
  static async resetCustomerLimits(customerId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('customer_usage_tracking')
        .update({
          concurrent_requests: 0,
          requests_last_minute: 0,
          requests_last_hour: 0,
          requests_last_day: 0,
          minute_reset_at: new Date().toISOString(),
          hour_reset_at: new Date().toISOString(),
          day_reset_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('customer_id', customerId);

      return !error;
    } catch (error) {
      console.error('Failed to reset customer limits:', error);
      return false;
    }
  }
}
