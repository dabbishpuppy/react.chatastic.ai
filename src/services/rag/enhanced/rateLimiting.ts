
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
  quota?: {
    concurrentJobs?: number;
  };
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
          reason: `Concurrent request limit exceeded (${limits.maxConcurrentRequests})`,
          quota: { concurrentJobs: limits.maxConcurrentRequests }
        };
      }

      // Check daily limit
      if (usage.currentUsage.requestsLastDay + requestedPages > limits.maxRequestsPerDay) {
        const resetTime = new Date();
        resetTime.setHours(24, 0, 0, 0); // Reset at midnight
        
        return {
          allowed: false,
          reason: `Daily limit exceeded (${limits.maxRequestsPerDay})`,
          resetTime,
          quota: { concurrentJobs: limits.maxConcurrentRequests }
        };
      }

      // Check hourly limit
      if (usage.currentUsage.requestsLastHour + requestedPages > limits.maxRequestsPerHour) {
        const resetTime = new Date();
        resetTime.setMinutes(60, 0, 0); // Reset at next hour
        
        return {
          allowed: false,
          reason: `Hourly limit exceeded (${limits.maxRequestsPerHour})`,
          resetTime,
          quota: { concurrentJobs: limits.maxConcurrentRequests }
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
          resetTime,
          quota: { concurrentJobs: limits.maxConcurrentRequests }
        };
      }

      // All checks passed
      return {
        allowed: true,
        remainingRequests: Math.min(
          limits.maxRequestsPerDay - usage.currentUsage.requestsLastDay,
          limits.maxRequestsPerHour - usage.currentUsage.requestsLastHour,
          effectiveMinuteLimit - usage.currentUsage.requestsLastMinute
        ),
        quota: { concurrentJobs: limits.maxConcurrentRequests }
      };

    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow request but log error
      return { 
        allowed: true,
        quota: { concurrentJobs: 5 }
      };
    }
  }

  // Record usage for a customer (simplified version using existing tables)
  static async recordUsage(customerId: string, pages: number = 1): Promise<void> {
    try {
      // For now, just log usage since we don't have the customer_usage_tracking table
      console.log(`📊 Recording usage for customer ${customerId}: ${pages} pages`);
      
      // Could store in agent_sources metadata or create a simple tracking mechanism
      // This is a simplified implementation that doesn't require new DB tables
    } catch (error) {
      console.error('Usage recording failed:', error);
    }
  }

  // Get current usage for a customer (simplified implementation)
  static async getCustomerUsage(customerId: string): Promise<CustomerUsage> {
    try {
      // Get customer tier (default to basic if not found)
      const tierName = await this.getCustomerTier(customerId);
      const tier: CustomerTier = {
        name: tierName,
        limits: this.TIER_CONFIGS[tierName]
      };

      // For now, return mock usage data since we don't have the tracking table
      // In a real implementation, this would query the customer_usage_tracking table
      const currentUsage = {
        requestsLastMinute: 0,
        requestsLastHour: 0,
        requestsLastDay: 0,
        concurrentRequests: 0
      };

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

  // Get customer tier (simplified implementation)
  private static async getCustomerTier(customerId: string): Promise<'basic' | 'pro' | 'enterprise'> {
    try {
      // Check team metadata for tier information
      const { data: team } = await supabase
        .from('teams')
        .select('metadata')
        .eq('id', customerId)
        .single();

      const metadata = team?.metadata as any;
      return metadata?.tier || 'basic';
    } catch (error) {
      console.warn('Failed to get customer tier:', error);
      return 'basic';
    }
  }

  // Simplified concurrent request tracking (without DB functions)
  static async incrementConcurrentRequests(customerId: string): Promise<void> {
    try {
      console.log(`📈 Incrementing concurrent requests for customer ${customerId}`);
      // In a real implementation, this would use atomic operations
      // For now, we'll just log it
    } catch (error) {
      console.error('Concurrent request increment failed:', error);
    }
  }

  // Simplified concurrent request tracking (without DB functions)
  static async decrementConcurrentRequests(customerId: string): Promise<void> {
    try {
      console.log(`📉 Decrementing concurrent requests for customer ${customerId}`);
      // In a real implementation, this would use atomic operations
      // For now, we'll just log it
    } catch (error) {
      console.error('Concurrent request decrement failed:', error);
    }
  }

  // Reset usage counters (simplified implementation)
  static async resetUsageCounters(): Promise<void> {
    try {
      console.log('🔄 Resetting usage counters (simplified implementation)');
      // In a real implementation, this would reset the customer_usage_tracking table
    } catch (error) {
      console.error('Usage counter reset failed:', error);
    }
  }

  // Get rate limit status for monitoring (simplified implementation)
  static async getRateLimitStatus(): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    rateLimitedCustomers: number;
    avgRequestsPerMinute: number;
  }> {
    try {
      // Get basic stats from existing tables
      const { count: totalCustomers } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true });

      return {
        totalCustomers: totalCustomers || 0,
        activeCustomers: 0, // Would need usage tracking to determine
        rateLimitedCustomers: 0, // Would need usage tracking to determine
        avgRequestsPerMinute: 0 // Would need usage tracking to determine
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
