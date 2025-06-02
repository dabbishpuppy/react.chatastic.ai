
import { supabase } from "@/integrations/supabase/client";

export interface ProductionRateLimitCheck {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
  currentUsage: {
    concurrent: number;
    perMinute: number;
    perHour: number;
    perDay: number;
  };
  limits: {
    concurrent: number;
    perMinute: number;
    perHour: number;
    perDay: number;
  };
}

export class RealRateLimitingService {
  private static readonly TIER_LIMITS = {
    basic: { concurrent: 5, perMinute: 10, perHour: 100, perDay: 500 },
    pro: { concurrent: 20, perMinute: 50, perHour: 1000, perDay: 10000 },
    enterprise: { concurrent: 100, perMinute: 200, perHour: 5000, perDay: 100000 }
  };

  // Check rate limits using real database functions with improved error handling
  static async checkRateLimit(customerId: string, requestedJobs: number = 1): Promise<ProductionRateLimitCheck> {
    try {
      console.log(`🔍 Checking rate limit for customer: ${customerId}, requested jobs: ${requestedJobs}`);

      // Get customer tier with error handling
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('metadata')
        .eq('id', customerId)
        .single();

      if (teamError) {
        console.error('Error fetching team data:', teamError);
        // Fallback to basic tier on error
        return this.createFailsafeResponse('Failed to fetch team data');
      }

      const tierName = (teamData?.metadata as any)?.tier || 'basic';
      const limits = this.TIER_LIMITS[tierName as keyof typeof this.TIER_LIMITS] || this.TIER_LIMITS.basic;

      // Get current usage from the real tracking table with error handling
      const { data: usage, error: usageError } = await supabase
        .from('customer_usage_tracking')
        .select('*')
        .eq('customer_id', customerId)
        .maybeSingle(); // Use maybeSingle instead of single to handle missing records

      if (usageError) {
        console.error('Error fetching usage data:', usageError);
        // Allow request but log the error
        console.warn(`Usage tracking unavailable for customer ${customerId}, allowing request`);
        return {
          allowed: true,
          currentUsage: { concurrent: 0, perMinute: 0, perHour: 0, perDay: 0 },
          limits
        };
      }

      const currentUsage = {
        concurrent: usage?.concurrent_requests || 0,
        perMinute: usage?.requests_last_minute || 0,
        perHour: usage?.requests_last_hour || 0,
        perDay: usage?.requests_last_day || 0
      };

      // Check concurrent limit
      if (currentUsage.concurrent + requestedJobs > limits.concurrent) {
        return {
          allowed: false,
          reason: `Concurrent job limit exceeded (${limits.concurrent})`,
          currentUsage,
          limits
        };
      }

      // Check per-minute limit
      if (currentUsage.perMinute + requestedJobs > limits.perMinute) {
        return {
          allowed: false,
          reason: `Per-minute limit exceeded (${limits.perMinute})`,
          retryAfter: 60,
          currentUsage,
          limits
        };
      }

      // Check per-hour limit
      if (currentUsage.perHour + requestedJobs > limits.perHour) {
        return {
          allowed: false,
          reason: `Hourly limit exceeded (${limits.perHour})`,
          retryAfter: 3600,
          currentUsage,
          limits
        };
      }

      // Check per-day limit
      if (currentUsage.perDay + requestedJobs > limits.perDay) {
        return {
          allowed: false,
          reason: `Daily limit exceeded (${limits.perDay})`,
          retryAfter: 86400,
          currentUsage,
          limits
        };
      }

      return {
        allowed: true,
        currentUsage,
        limits
      };

    } catch (error) {
      console.error('Rate limit check failed with unexpected error:', error);
      return this.createFailsafeResponse('Unexpected error during rate limit check');
    }
  }

  // Create a failsafe response when rate limiting fails
  private static createFailsafeResponse(reason: string): ProductionRateLimitCheck {
    return {
      allowed: false,
      reason,
      currentUsage: { concurrent: 0, perMinute: 0, perHour: 0, perDay: 0 },
      limits: this.TIER_LIMITS.basic
    };
  }

  // Increment concurrent requests using database function with improved error handling
  static async incrementConcurrentRequests(customerId: string): Promise<number> {
    try {
      console.log(`📈 Incrementing concurrent requests for customer: ${customerId}`);

      const { data, error } = await supabase.rpc('increment_concurrent_requests', {
        target_customer_id: customerId
      });

      if (error) {
        console.error('Failed to increment concurrent requests:', error);
        // Don't throw error, just log and return 0
        return 0;
      }

      const newCount = data || 0;
      console.log(`✅ Incremented concurrent requests for ${customerId}: ${newCount}`);
      return newCount;
    } catch (error) {
      console.error('Error incrementing concurrent requests:', error);
      return 0;
    }
  }

  // Decrement concurrent requests using database function with improved error handling
  static async decrementConcurrentRequests(customerId: string): Promise<number> {
    try {
      console.log(`📉 Decrementing concurrent requests for customer: ${customerId}`);

      const { data, error } = await supabase.rpc('decrement_concurrent_requests', {
        target_customer_id: customerId
      });

      if (error) {
        console.error('Failed to decrement concurrent requests:', error);
        // Don't throw error, just log and return 0
        return 0;
      }

      const newCount = data || 0;
      console.log(`✅ Decremented concurrent requests for ${customerId}: ${newCount}`);
      return newCount;
    } catch (error) {
      console.error('Error decrementing concurrent requests:', error);
      return 0;
    }
  }

  // Get real usage statistics from database with improved error handling
  static async getUsageStats(customerId: string): Promise<{
    current: { concurrent: number; perMinute: number; perHour: number; perDay: number };
    resetTimes: { minute: string; hour: string; day: string };
  }> {
    try {
      console.log(`📊 Fetching usage stats for customer: ${customerId}`);

      const { data, error } = await supabase
        .from('customer_usage_tracking')
        .select('*')
        .eq('customer_id', customerId)
        .maybeSingle(); // Use maybeSingle to handle missing records gracefully

      if (error) {
        console.error('Failed to get usage stats:', error);
        return this.getDefaultUsageStats();
      }

      if (!data) {
        console.log(`No usage data found for customer ${customerId}, returning defaults`);
        return this.getDefaultUsageStats();
      }

      return {
        current: {
          concurrent: data.concurrent_requests || 0,
          perMinute: data.requests_last_minute || 0,
          perHour: data.requests_last_hour || 0,
          perDay: data.requests_last_day || 0
        },
        resetTimes: {
          minute: data.minute_reset_at || new Date().toISOString(),
          hour: data.hour_reset_at || new Date().toISOString(),
          day: data.day_reset_at || new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Failed to get usage stats with unexpected error:', error);
      return this.getDefaultUsageStats();
    }
  }

  // Get default usage stats when data is unavailable
  private static getDefaultUsageStats() {
    const now = new Date().toISOString();
    return {
      current: { concurrent: 0, perMinute: 0, perHour: 0, perDay: 0 },
      resetTimes: {
        minute: now,
        hour: now,
        day: now
      }
    };
  }

  // Initialize usage tracking for a customer if it doesn't exist
  static async initializeCustomerUsage(customerId: string): Promise<void> {
    try {
      console.log(`🔧 Initializing usage tracking for customer: ${customerId}`);

      const { error } = await supabase
        .from('customer_usage_tracking')
        .upsert({
          customer_id: customerId,
          concurrent_requests: 0,
          requests_last_minute: 0,
          requests_last_hour: 0,
          requests_last_day: 0,
          minute_reset_at: new Date().toISOString(),
          hour_reset_at: new Date().toISOString(),
          day_reset_at: new Date().toISOString(),
          last_request_at: new Date().toISOString()
        }, {
          onConflict: 'customer_id'
        });

      if (error) {
        console.error('Failed to initialize customer usage:', error);
      } else {
        console.log(`✅ Initialized usage tracking for customer: ${customerId}`);
      }
    } catch (error) {
      console.error('Error initializing customer usage:', error);
    }
  }
}
