
import { supabase } from "@/integrations/supabase/client";

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  maxConcurrentRequests: number;
  burstLimit: number;
}

export interface CustomerTier {
  name: 'basic' | 'pro' | 'enterprise';
  limits: RateLimitConfig;
}

export interface RateLimitCheck {
  allowed: boolean;
  reason?: string;
  resetTime?: Date;
  remainingRequests?: number;
}

export interface CustomerUsage {
  customerId: string;
  tier: CustomerTier;
  currentUsage: {
    requestsLastMinute: number;
    requestsLastHour: number;
    requestsLastDay: number;
    concurrentRequests: number;
  };
  lastReset: Date;
}

export class RateLimitingService {
  private static readonly TIER_CONFIGS: Record<string, RateLimitConfig> = {
    basic: {
      maxRequestsPerMinute: 10,
      maxRequestsPerHour: 100,
      maxRequestsPerDay: 500,
      maxConcurrentRequests: 5,
      burstLimit: 20
    },
    pro: {
      maxRequestsPerMinute: 50,
      maxRequestsPerHour: 1000,
      maxRequestsPerDay: 10000,
      maxConcurrentRequests: 20,
      burstLimit: 100
    },
    enterprise: {
      maxRequestsPerMinute: 200,
      maxRequestsPerHour: 5000,
      maxRequestsPerDay: 100000,
      maxConcurrentRequests: 100,
      burstLimit: 500
    }
  };

  // Check if a customer can start a new crawl
  static async canStartCrawl(customerId: string, requestedPages: number = 1): Promise<RateLimitCheck> {
    try {
      const usage = await this.getCustomerUsage(customerId);
      const limits = usage.tier.limits;

      // Check concurrent requests
      if (usage.currentUsage.concurrentRequests >= limits.maxConcurrentRequests) {
        return {
          allowed: false,
          reason: `Concurrent request limit exceeded (${limits.maxConcurrentRequests})`
        };
      }

      // Check daily limit
      if (usage.currentUsage.requestsLastDay + requestedPages > limits.maxRequestsPerDay) {
        const resetTime = new Date();
        resetTime.setHours(24, 0, 0, 0); // Reset at midnight
        
        return {
          allowed: false,
          reason: `Daily limit exceeded (${limits.maxRequestsPerDay})`,
          resetTime
        };
      }

      // Check hourly limit
      if (usage.currentUsage.requestsLastHour + requestedPages > limits.maxRequestsPerHour) {
        const resetTime = new Date();
        resetTime.setMinutes(60, 0, 0); // Reset at next hour
        
        return {
          allowed: false,
          reason: `Hourly limit exceeded (${limits.maxRequestsPerHour})`,
          resetTime
        };
      }

      // Check minute limit (with burst allowance)
      const effectiveMinuteLimit = Math.min(
        limits.maxRequestsPerMinute + limits.burstLimit,
        limits.maxRequestsPerHour
      );
      
      if (usage.currentUsage.requestsLastMinute + requestedPages > effectiveMinuteLimit) {
        const resetTime = new Date();
        resetTime.setSeconds(60, 0); // Reset at next minute
        
        return {
          allowed: false,
          reason: `Rate limit exceeded (${effectiveMinuteLimit}/min)`,
          resetTime
        };
      }

      // All checks passed
      return {
        allowed: true,
        remainingRequests: Math.min(
          limits.maxRequestsPerDay - usage.currentUsage.requestsLastDay,
          limits.maxRequestsPerHour - usage.currentUsage.requestsLastHour,
          effectiveMinuteLimit - usage.currentUsage.requestsLastMinute
        )
      };

    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow request but log error
      return { allowed: true };
    }
  }

  // Record usage for a customer
  static async recordUsage(customerId: string, pages: number = 1): Promise<void> {
    try {
      const now = new Date();
      
      // Update or insert usage record
      const { error } = await supabase
        .from('customer_usage_tracking')
        .upsert({
          customer_id: customerId,
          requests_last_minute: pages,
          requests_last_hour: pages,
          requests_last_day: pages,
          concurrent_requests: 1,
          last_request_at: now.toISOString(),
          updated_at: now.toISOString()
        }, {
          onConflict: 'customer_id'
        });

      if (error) {
        console.error('Failed to record usage:', error);
      }
    } catch (error) {
      console.error('Usage recording failed:', error);
    }
  }

  // Get current usage for a customer
  static async getCustomerUsage(customerId: string): Promise<CustomerUsage> {
    try {
      // Get customer tier (default to basic if not found)
      const tierName = await this.getCustomerTier(customerId);
      const tier: CustomerTier = {
        name: tierName,
        limits: this.TIER_CONFIGS[tierName]
      };

      // Get current usage from database
      const { data: usageData } = await supabase
        .from('customer_usage_tracking')
        .select('*')
        .eq('customer_id', customerId)
        .single();

      let currentUsage = {
        requestsLastMinute: 0,
        requestsLastHour: 0,
        requestsLastDay: 0,
        concurrentRequests: 0
      };

      if (usageData) {
        const lastRequest = new Date(usageData.last_request_at);
        const now = new Date();
        const minutesAgo = (now.getTime() - lastRequest.getTime()) / (1000 * 60);

        // Reset counters based on time elapsed
        if (minutesAgo < 1) {
          currentUsage.requestsLastMinute = usageData.requests_last_minute || 0;
        }
        if (minutesAgo < 60) {
          currentUsage.requestsLastHour = usageData.requests_last_hour || 0;
        }
        if (minutesAgo < (24 * 60)) {
          currentUsage.requestsLastDay = usageData.requests_last_day || 0;
        }
        
        currentUsage.concurrentRequests = usageData.concurrent_requests || 0;
      }

      return {
        customerId,
        tier,
        currentUsage,
        lastReset: new Date()
      };

    } catch (error) {
      console.error('Failed to get customer usage:', error);
      
      // Return default usage for basic tier
      return {
        customerId,
        tier: {
          name: 'basic',
          limits: this.TIER_CONFIGS.basic
        },
        currentUsage: {
          requestsLastMinute: 0,
          requestsLastHour: 0,
          requestsLastDay: 0,
          concurrentRequests: 0
        },
        lastReset: new Date()
      };
    }
  }

  // Get customer tier (mock implementation - replace with actual logic)
  private static async getCustomerTier(customerId: string): Promise<'basic' | 'pro' | 'enterprise'> {
    try {
      // This would typically query a subscription/billing table
      // For now, return basic as default
      return 'basic';
    } catch (error) {
      console.warn('Failed to get customer tier:', error);
      return 'basic';
    }
  }

  // Increment concurrent request counter
  static async incrementConcurrentRequests(customerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('increment_concurrent_requests', {
          customer_id_param: customerId
        });

      if (error) {
        console.error('Failed to increment concurrent requests:', error);
      }
    } catch (error) {
      console.error('Concurrent request increment failed:', error);
    }
  }

  // Decrement concurrent request counter
  static async decrementConcurrentRequests(customerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('decrement_concurrent_requests', {
          customer_id_param: customerId
        });

      if (error) {
        console.error('Failed to decrement concurrent requests:', error);
      }
    } catch (error) {
      console.error('Concurrent request decrement failed:', error);
    }
  }

  // Reset usage counters (called by scheduled job)
  static async resetUsageCounters(): Promise<void> {
    try {
      const now = new Date();
      
      // Reset minute counters
      const { error: minuteError } = await supabase
        .from('customer_usage_tracking')
        .update({
          requests_last_minute: 0,
          updated_at: now.toISOString()
        })
        .lt('last_request_at', new Date(now.getTime() - 60000).toISOString());

      // Reset hour counters
      const { error: hourError } = await supabase
        .from('customer_usage_tracking')
        .update({
          requests_last_hour: 0,
          updated_at: now.toISOString()
        })
        .lt('last_request_at', new Date(now.getTime() - 3600000).toISOString());

      // Reset day counters
      const { error: dayError } = await supabase
        .from('customer_usage_tracking')
        .update({
          requests_last_day: 0,
          updated_at: now.toISOString()
        })
        .lt('last_request_at', new Date(now.getTime() - 86400000).toISOString());

      if (minuteError || hourError || dayError) {
        console.error('Failed to reset some usage counters:', { minuteError, hourError, dayError });
      }
    } catch (error) {
      console.error('Usage counter reset failed:', error);
    }
  }

  // Get rate limit status for monitoring
  static async getRateLimitStatus(): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    rateLimitedCustomers: number;
    avgRequestsPerMinute: number;
  }> {
    try {
      const { data: stats } = await supabase
        .from('customer_usage_tracking')
        .select('requests_last_minute, concurrent_requests, last_request_at');

      if (!stats) {
        return {
          totalCustomers: 0,
          activeCustomers: 0,
          rateLimitedCustomers: 0,
          avgRequestsPerMinute: 0
        };
      }

      const now = new Date();
      const activeCustomers = stats.filter(s => 
        new Date(s.last_request_at).getTime() > now.getTime() - 300000 // Active in last 5 minutes
      );

      const rateLimitedCustomers = stats.filter(s => 
        (s.concurrent_requests || 0) >= this.TIER_CONFIGS.basic.maxConcurrentRequests
      );

      const avgRequestsPerMinute = activeCustomers.length > 0
        ? activeCustomers.reduce((sum, s) => sum + (s.requests_last_minute || 0), 0) / activeCustomers.length
        : 0;

      return {
        totalCustomers: stats.length,
        activeCustomers: activeCustomers.length,
        rateLimitedCustomers: rateLimitedCustomers.length,
        avgRequestsPerMinute
      };
    } catch (error) {
      console.error('Failed to get rate limit status:', error);
      return {
        totalCustomers: 0,
        activeCustomers: 0,
        rateLimitedCustomers: 0,
        avgRequestsPerMinute: 0
      };
    }
  }
}
