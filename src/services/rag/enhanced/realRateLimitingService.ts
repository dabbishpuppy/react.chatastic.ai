
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

  // Check rate limits using real database functions
  static async checkRateLimit(customerId: string, requestedJobs: number = 1): Promise<ProductionRateLimitCheck> {
    try {
      // Get customer tier
      const { data: teamData } = await supabase
        .from('teams')
        .select('metadata')
        .eq('id', customerId)
        .single();

      const tierName = (teamData?.metadata as any)?.tier || 'basic';
      const limits = this.TIER_LIMITS[tierName as keyof typeof this.TIER_LIMITS] || this.TIER_LIMITS.basic;

      // Get current usage from the real tracking table
      const { data: usage } = await supabase
        .from('customer_usage_tracking')
        .select('*')
        .eq('customer_id', customerId)
        .single();

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
      console.error('Rate limit check failed:', error);
      return {
        allowed: false,
        reason: 'Rate limit check failed',
        currentUsage: { concurrent: 0, perMinute: 0, perHour: 0, perDay: 0 },
        limits: this.TIER_LIMITS.basic
      };
    }
  }

  // Increment concurrent requests using database function
  static async incrementConcurrentRequests(customerId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('increment_concurrent_requests', {
        target_customer_id: customerId
      });

      if (error) {
        console.error('Failed to increment concurrent requests:', error);
        return 0;
      }

      console.log(`📈 Incremented concurrent requests for ${customerId}: ${data}`);
      return data || 0;
    } catch (error) {
      console.error('Error incrementing concurrent requests:', error);
      return 0;
    }
  }

  // Decrement concurrent requests using database function
  static async decrementConcurrentRequests(customerId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('decrement_concurrent_requests', {
        target_customer_id: customerId
      });

      if (error) {
        console.error('Failed to decrement concurrent requests:', error);
        return 0;
      }

      console.log(`📉 Decremented concurrent requests for ${customerId}: ${data}`);
      return data || 0;
    } catch (error) {
      console.error('Error decrementing concurrent requests:', error);
      return 0;
    }
  }

  // Get real usage statistics from database
  static async getUsageStats(customerId: string): Promise<{
    current: { concurrent: number; perMinute: number; perHour: number; perDay: number };
    resetTimes: { minute: string; hour: string; day: string };
  }> {
    try {
      const { data } = await supabase
        .from('customer_usage_tracking')
        .select('*')
        .eq('customer_id', customerId)
        .single();

      if (!data) {
        return {
          current: { concurrent: 0, perMinute: 0, perHour: 0, perDay: 0 },
          resetTimes: {
            minute: new Date().toISOString(),
            hour: new Date().toISOString(),
            day: new Date().toISOString()
          }
        };
      }

      return {
        current: {
          concurrent: data.concurrent_requests,
          perMinute: data.requests_last_minute,
          perHour: data.requests_last_hour,
          perDay: data.requests_last_day
        },
        resetTimes: {
          minute: data.minute_reset_at,
          hour: data.hour_reset_at,
          day: data.day_reset_at
        }
      };
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      return {
        current: { concurrent: 0, perMinute: 0, perHour: 0, perDay: 0 },
        resetTimes: {
          minute: new Date().toISOString(),
          hour: new Date().toISOString(),
          day: new Date().toISOString()
        }
      };
    }
  }
}
