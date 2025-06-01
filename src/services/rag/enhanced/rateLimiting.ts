
import { supabase } from "@/integrations/supabase/client";

export interface CustomerQuota {
  customerId: string;
  tier: 'basic' | 'pro' | 'enterprise';
  pagesPerDay: number;
  concurrentJobs: number;
  storageQuotaGB: number;
  resetDate: string;
  currentUsage: {
    pagesProcessed: number;
    activeJobs: number;
    storageUsedGB: number;
  };
}

export class RateLimitingService {
  private static readonly TIER_LIMITS = {
    basic: { pagesPerDay: 100, concurrentJobs: 5, storageQuotaGB: 0.5 },
    pro: { pagesPerDay: 1000, concurrentJobs: 20, storageQuotaGB: 5 },
    enterprise: { pagesPerDay: 10000, concurrentJobs: 100, storageQuotaGB: 50 }
  };

  // Check if customer can start a new crawl
  static async canStartCrawl(
    customerId: string, 
    estimatedPages: number
  ): Promise<{ allowed: boolean; reason?: string; quota?: CustomerQuota }> {
    const quota = await this.getCustomerQuota(customerId);
    
    // Check daily page limit
    const pagesAfterCrawl = quota.currentUsage.pagesProcessed + estimatedPages;
    if (pagesAfterCrawl > quota.pagesPerDay) {
      return {
        allowed: false,
        reason: `Would exceed daily page limit (${quota.pagesPerDay}). Current: ${quota.currentUsage.pagesProcessed}, Requested: ${estimatedPages}`,
        quota
      };
    }

    // Check concurrent jobs
    if (quota.currentUsage.activeJobs >= quota.concurrentJobs) {
      return {
        allowed: false,
        reason: `Maximum concurrent jobs reached (${quota.concurrentJobs})`,
        quota
      };
    }

    // Check storage quota
    if (quota.currentUsage.storageUsedGB >= quota.storageQuotaGB) {
      return {
        allowed: false,
        reason: `Storage quota exceeded (${quota.storageQuotaGB}GB)`,
        quota
      };
    }

    return { allowed: true, quota };
  }

  // Get customer quota and current usage
  static async getCustomerQuota(customerId: string): Promise<CustomerQuota> {
    // Get customer tier (default to basic if not found)
    const { data: customerData } = await supabase
      .from('teams')
      .select('id, metadata')
      .eq('id', customerId)
      .single();

    const tier = (customerData?.metadata as any)?.tier || 'basic';
    const limits = this.TIER_LIMITS[tier as keyof typeof this.TIER_LIMITS];

    // Get current usage for today
    const today = new Date().toISOString().split('T')[0];
    const tomorrowISO = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Count pages processed today
    const { count: pagesProcessed } = await supabase
      .from('crawl_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .gte('completed_at', `${today}T00:00:00.000Z`)
      .lt('completed_at', tomorrowISO);

    // Count active jobs
    const { count: activeJobs } = await supabase
      .from('crawl_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .in('status', ['pending', 'in_progress']);

    // Calculate storage usage
    const storageUsedGB = await this.calculateStorageUsage(customerId);

    return {
      customerId,
      tier: tier as CustomerQuota['tier'],
      pagesPerDay: limits.pagesPerDay,
      concurrentJobs: limits.concurrentJobs,
      storageQuotaGB: limits.storageQuotaGB,
      resetDate: tomorrowISO,
      currentUsage: {
        pagesProcessed: pagesProcessed || 0,
        activeJobs: activeJobs || 0,
        storageUsedGB
      }
    };
  }

  // Calculate total storage usage for a customer
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

  // Increment usage counters
  static async incrementUsage(
    customerId: string,
    type: 'pages' | 'storage',
    amount: number
  ): Promise<void> {
    // This would typically update a separate usage tracking table
    // For now, we'll just log it since usage is calculated dynamically
    console.log(`📊 Usage increment for ${customerId}: ${type} +${amount}`);
  }

  // Get usage statistics
  static async getUsageStats(customerId: string): Promise<{
    dailyPages: { date: string; count: number }[];
    storageGrowth: { date: string; sizeGB: number }[];
    jobSuccessRate: number;
  }> {
    // Get daily page counts for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const { data: dailyJobs } = await supabase
      .from('crawl_jobs')
      .select('completed_at, status')
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .gte('completed_at', thirtyDaysAgo.toISOString())
      .order('completed_at');

    // Group by date
    const dailyPages: { [date: string]: number } = {};
    dailyJobs?.forEach(job => {
      const date = job.completed_at.split('T')[0];
      dailyPages[date] = (dailyPages[date] || 0) + 1;
    });

    // Get job success rate
    const { data: allJobs } = await supabase
      .from('crawl_jobs')
      .select('status')
      .eq('customer_id', customerId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const completedJobs = allJobs?.filter(job => job.status === 'completed').length || 0;
    const totalJobs = allJobs?.length || 0;
    const jobSuccessRate = totalJobs > 0 ? completedJobs / totalJobs : 0;

    return {
      dailyPages: Object.entries(dailyPages).map(([date, count]) => ({ date, count })),
      storageGrowth: [], // Would need historical tracking
      jobSuccessRate
    };
  }

  // Update customer tier
  static async updateCustomerTier(
    customerId: string,
    newTier: CustomerQuota['tier']
  ): Promise<void> {
    const { error } = await supabase
      .from('teams')
      .update({
        metadata: supabase.sql(`
          COALESCE(metadata, '{}'::jsonb) || '{"tier": "${newTier}"}'::jsonb
        `)
      })
      .eq('id', customerId);

    if (error) {
      throw new Error(`Failed to update customer tier: ${error.message}`);
    }

    console.log(`📈 Updated customer ${customerId} to tier: ${newTier}`);
  }
}
