
import { supabase } from "@/integrations/supabase/client";

export interface CustomerTier {
  name: 'basic' | 'pro' | 'enterprise' | 'custom';
  pagesPerDay: number;
  pagesPerHour: number;
  concurrentJobs: number;
  storageQuotaGB: number;
  maxRetries: number;
  priorityLevel: number; // Higher = better priority
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number; // seconds
  quotaRemaining?: {
    daily: number;
    hourly: number;
    concurrent: number;
    storage: number;
  };
}

export interface CustomerUsage {
  customerId: string;
  tier: CustomerTier;
  usage: {
    dailyPages: number;
    hourlyPages: number;
    activeJobs: number;
    storageUsedGB: number;
  };
  quotas: {
    dailyRemaining: number;
    hourlyRemaining: number;
    concurrentRemaining: number;
    storageRemaining: number;
  };
  resetTimes: {
    dailyReset: string;
    hourlyReset: string;
  };
}

export class ProductionRateLimiting {
  private static readonly TIER_CONFIGS: Record<string, CustomerTier> = {
    basic: {
      name: 'basic',
      pagesPerDay: 100,
      pagesPerHour: 50,
      concurrentJobs: 5,
      storageQuotaGB: 0.5,
      maxRetries: 3,
      priorityLevel: 1
    },
    pro: {
      name: 'pro',
      pagesPerDay: 1000,
      pagesPerHour: 200,
      concurrentJobs: 20,
      storageQuotaGB: 5,
      maxRetries: 5,
      priorityLevel: 2
    },
    enterprise: {
      name: 'enterprise',
      pagesPerDay: 10000,
      pagesPerHour: 1000,
      concurrentJobs: 100,
      storageQuotaGB: 50,
      maxRetries: 10,
      priorityLevel: 3
    },
    custom: {
      name: 'custom',
      pagesPerDay: 50000,
      pagesPerHour: 5000,
      concurrentJobs: 500,
      storageQuotaGB: 200,
      maxRetries: 15,
      priorityLevel: 4
    }
  };

  // Check if customer can start new jobs
  static async checkRateLimit(
    customerId: string, 
    requestedPages: number = 1
  ): Promise<RateLimitResult> {
    try {
      const usage = await this.getCustomerUsage(customerId);
      
      // Check daily limit
      if (usage.usage.dailyPages + requestedPages > usage.tier.pagesPerDay) {
        const resetTime = new Date(usage.resetTimes.dailyReset).getTime();
        const now = Date.now();
        const retryAfter = Math.max(0, Math.ceil((resetTime - now) / 1000));
        
        return {
          allowed: false,
          reason: `Daily page limit exceeded (${usage.tier.pagesPerDay}). Resets in ${Math.ceil(retryAfter / 3600)} hours.`,
          retryAfter,
          quotaRemaining: usage.quotas
        };
      }

      // Check hourly limit
      if (usage.usage.hourlyPages + requestedPages > usage.tier.pagesPerHour) {
        const resetTime = new Date(usage.resetTimes.hourlyReset).getTime();
        const now = Date.now();
        const retryAfter = Math.max(0, Math.ceil((resetTime - now) / 1000));
        
        return {
          allowed: false,
          reason: `Hourly page limit exceeded (${usage.tier.pagesPerHour}). Resets in ${Math.ceil(retryAfter / 60)} minutes.`,
          retryAfter,
          quotaRemaining: usage.quotas
        };
      }

      // Check concurrent jobs
      if (usage.usage.activeJobs >= usage.tier.concurrentJobs) {
        return {
          allowed: false,
          reason: `Maximum concurrent jobs reached (${usage.tier.concurrentJobs}). Wait for jobs to complete.`,
          quotaRemaining: usage.quotas
        };
      }

      // Check storage quota
      if (usage.usage.storageUsedGB >= usage.tier.storageQuotaGB) {
        return {
          allowed: false,
          reason: `Storage quota exceeded (${usage.tier.storageQuotaGB}GB). Delete old sources or upgrade plan.`,
          quotaRemaining: usage.quotas
        };
      }

      // All checks passed
      return {
        allowed: true,
        quotaRemaining: {
          daily: usage.quotas.dailyRemaining - requestedPages,
          hourly: usage.quotas.hourlyRemaining - requestedPages,
          concurrent: usage.quotas.concurrentRemaining,
          storage: usage.quotas.storageRemaining
        }
      };

    } catch (error) {
      console.error('Error checking rate limit:', error);
      
      // Fail open for basic users to prevent blocking
      return {
        allowed: true,
        reason: 'Rate limit check failed, allowing request'
      };
    }
  }

  // Get comprehensive customer usage data
  static async getCustomerUsage(customerId: string): Promise<CustomerUsage> {
    // Get customer tier
    const { data: teamData } = await supabase
      .from('teams')
      .select('metadata')
      .eq('id', customerId)
      .single();

    const tierName = (teamData?.metadata as any)?.tier || 'basic';
    const tier = this.TIER_CONFIGS[tierName] || this.TIER_CONFIGS.basic;

    // Calculate time boundaries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const nextHourStart = new Date(hourStart.getTime() + 60 * 60 * 1000);

    // Get daily usage
    const { count: dailyPages } = await supabase
      .from('source_pages')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .gte('completed_at', todayStart.toISOString())
      .lt('completed_at', tomorrowStart.toISOString());

    // Get hourly usage
    const { count: hourlyPages } = await supabase
      .from('source_pages')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .gte('completed_at', hourStart.toISOString())
      .lt('completed_at', nextHourStart.toISOString());

    // Get active jobs
    const { count: activeJobs } = await supabase
      .from('source_pages')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .in('status', ['pending', 'in_progress']);

    // Calculate storage usage
    const storageUsedGB = await this.calculateStorageUsage(customerId);

    const usage = {
      dailyPages: dailyPages || 0,
      hourlyPages: hourlyPages || 0,
      activeJobs: activeJobs || 0,
      storageUsedGB
    };

    const quotas = {
      dailyRemaining: Math.max(0, tier.pagesPerDay - usage.dailyPages),
      hourlyRemaining: Math.max(0, tier.pagesPerHour - usage.hourlyPages),
      concurrentRemaining: Math.max(0, tier.concurrentJobs - usage.activeJobs),
      storageRemaining: Math.max(0, tier.storageQuotaGB - usage.storageUsedGB)
    };

    return {
      customerId,
      tier,
      usage,
      quotas,
      resetTimes: {
        dailyReset: tomorrowStart.toISOString(),
        hourlyReset: nextHourStart.toISOString()
      }
    };
  }

  // Calculate storage usage
  private static async calculateStorageUsage(customerId: string): Promise<number> {
    const { data: sources } = await supabase
      .from('agent_sources')
      .select('compressed_content_size, total_content_size')
      .eq('team_id', customerId);

    if (!sources) return 0;

    const totalBytes = sources.reduce((sum, source) => {
      return sum + (source.compressed_content_size || source.total_content_size || 0);
    }, 0);

    return totalBytes / (1024 * 1024 * 1024); // Convert to GB
  }

  // Record usage when jobs complete
  static async recordPageProcessed(customerId: string, pageSize: number = 0): Promise<void> {
    try {
      // Update usage tracking
      const now = new Date().toISOString();
      
      await supabase
        .from('customer_usage_tracking')
        .upsert({
          customer_id: customerId,
          date: now.split('T')[0],
          pages_processed: pageSize,
          last_updated: now
        }, {
          onConflict: 'customer_id,date'
        });

    } catch (error) {
      console.error('Error recording usage:', error);
    }
  }

  // Upgrade customer tier
  static async upgradeCustomerTier(
    customerId: string,
    newTier: 'basic' | 'pro' | 'enterprise' | 'custom'
  ): Promise<void> {
    const { data: currentTeam } = await supabase
      .from('teams')
      .select('metadata')
      .eq('id', customerId)
      .single();

    const currentMetadata = (currentTeam?.metadata as any) || {};
    const updatedMetadata = {
      ...currentMetadata,
      tier: newTier,
      upgraded_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('teams')
      .update({ metadata: updatedMetadata })
      .eq('id', customerId);

    if (error) {
      throw new Error(`Failed to upgrade tier: ${error.message}`);
    }

    console.log(`📈 Upgraded customer ${customerId} to ${newTier} tier`);
  }

  // Get customer priority for job scheduling
  static async getCustomerPriority(customerId: string): Promise<number> {
    const usage = await this.getCustomerUsage(customerId);
    return usage.tier.priorityLevel;
  }

  // Check if customer is within emergency limits (for circuit breaker)
  static async checkEmergencyLimits(customerId: string): Promise<{
    withinLimits: boolean;
    violations: string[];
  }> {
    const usage = await this.getCustomerUsage(customerId);
    const violations: string[] = [];

    // Check for extreme overuse
    if (usage.usage.dailyPages > usage.tier.pagesPerDay * 2) {
      violations.push('Daily pages exceed 200% of limit');
    }

    if (usage.usage.activeJobs > usage.tier.concurrentJobs * 1.5) {
      violations.push('Active jobs exceed 150% of limit');
    }

    if (usage.usage.storageUsedGB > usage.tier.storageQuotaGB * 1.2) {
      violations.push('Storage usage exceeds 120% of quota');
    }

    return {
      withinLimits: violations.length === 0,
      violations
    };
  }

  // Get usage analytics for dashboard
  static async getUsageAnalytics(customerId: string, days: number = 30): Promise<{
    dailyUsage: Array<{ date: string; pages: number; storage: number }>;
    trends: {
      averageDailyPages: number;
      peakDailyPages: number;
      storageGrowthRate: number;
      efficiencyScore: number;
    };
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const { data: dailyUsage } = await supabase
      .from('customer_usage_tracking')
      .select('*')
      .eq('customer_id', customerId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (!dailyUsage) {
      return {
        dailyUsage: [],
        trends: {
          averageDailyPages: 0,
          peakDailyPages: 0,
          storageGrowthRate: 0,
          efficiencyScore: 1.0
        }
      };
    }

    const pages = dailyUsage.map(d => d.pages_processed || 0);
    const averageDailyPages = pages.reduce((sum, p) => sum + p, 0) / pages.length;
    const peakDailyPages = Math.max(...pages);

    // Calculate storage growth rate (simplified)
    const storageGrowthRate = dailyUsage.length > 1 
      ? (dailyUsage[dailyUsage.length - 1].storage_used || 0) - (dailyUsage[0].storage_used || 0)
      : 0;

    // Efficiency score based on compression and deduplication
    const usage = await this.getCustomerUsage(customerId);
    const efficiencyScore = Math.min(1.0, 1.0 - (usage.usage.storageUsedGB / (usage.usage.dailyPages * 0.001)));

    return {
      dailyUsage: dailyUsage.map(d => ({
        date: d.date,
        pages: d.pages_processed || 0,
        storage: d.storage_used || 0
      })),
      trends: {
        averageDailyPages,
        peakDailyPages,
        storageGrowthRate,
        efficiencyScore
      }
    };
  }
}
