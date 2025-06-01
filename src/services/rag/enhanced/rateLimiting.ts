import { supabase } from "@/integrations/supabase/client";
import { RealRateLimitingService } from './realRateLimitingService';

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

  // Updated to use real rate limiting service
  static async canStartCrawl(customerId: string, requestedPages: number = 1): Promise<RateLimitCheck> {
    try {
      const realCheck = await RealRateLimitingService.checkRateLimit(customerId, requestedPages);
      
      return {
        allowed: realCheck.allowed,
        reason: realCheck.reason,
        resetTime: realCheck.retryAfter ? new Date(Date.now() + realCheck.retryAfter * 1000) : undefined,
        remainingRequests: Math.max(0, realCheck.limits.perDay - realCheck.currentUsage.perDay),
        quota: {
          concurrentJobs: realCheck.limits.concurrent
        }
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return { 
        allowed: true,
        quota: { concurrentJobs: 5 }
      };
    }
  }

  // Updated to use real tracking
  static async recordUsage(customerId: string, pages: number = 1): Promise<void> {
    try {
      console.log(`📊 Recording usage for customer ${customerId}: ${pages} pages`);
      // The real rate limiting service handles usage tracking automatically
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

  // Updated to use real concurrent request tracking
  static async incrementConcurrentRequests(customerId: string): Promise<void> {
    try {
      await RealRateLimitingService.incrementConcurrentRequests(customerId);
    } catch (error) {
      console.error('Concurrent request increment failed:', error);
    }
  }

  // Updated to use real concurrent request tracking
  static async decrementConcurrentRequests(customerId: string): Promise<void> {
    try {
      await RealRateLimitingService.decrementConcurrentRequests(customerId);
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
