
import { UsageTracker, UsageMetrics, TokenUsage } from './usageTracker';
import { OpenAIUsageService, OpenAIOrganizationUsage } from './openAIUsageService';

export interface ComparisonMetrics {
  localUsage: UsageMetrics;
  openAIUsage: OpenAIOrganizationUsage;
  variance: {
    tokenDifference: number;
    costDifference: number;
    accuracyPercentage: number;
  };
  lastSyncTime: string;
}

export interface SyncReport {
  success: boolean;
  syncedRecords: number;
  discrepancies: Array<{
    date: string;
    localTokens: number;
    openAITokens: number;
    localCost: number;
    openAICost: number;
  }>;
  totalVariance: {
    tokens: number;
    cost: number;
  };
}

export class EnhancedUsageTracker extends UsageTracker {
  private static openAIApiKey: string | null = null;

  /**
   * Set OpenAI API key for real-time data fetching
   */
  static setOpenAIApiKey(apiKey: string): void {
    this.openAIApiKey = apiKey;
    console.log('🔑 OpenAI API key configured for usage tracking');
  }

  /**
   * Get OpenAI API key from environment or throw error
   */
  private static getOpenAIApiKey(): string {
    if (this.openAIApiKey) {
      return this.openAIApiKey;
    }

    // Try to get from environment variables (if available in edge functions)
    const envKey = typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : undefined;
    if (envKey) {
      return envKey;
    }

    throw new Error('OpenAI API key not configured. Call setOpenAIApiKey() first.');
  }

  /**
   * Fetch real-time usage data from OpenAI and compare with local tracking
   */
  static async getComparisonMetrics(
    teamId: string,
    timeRange?: { start: string; end: string }
  ): Promise<ComparisonMetrics> {
    try {
      const apiKey = this.getOpenAIApiKey();
      
      // Default to last 30 days if no time range provided
      const endTime = timeRange?.end || new Date().toISOString();
      const startTime = timeRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      console.log('📊 Fetching comparison metrics...', { teamId, startTime, endTime });

      // Fetch both local and OpenAI data in parallel
      const [localUsage, openAIUsage] = await Promise.all([
        this.getUsageMetrics(teamId, undefined, { start: startTime, end: endTime }),
        OpenAIUsageService.getOrganizationUsage(apiKey, startTime, endTime)
      ]);

      // Calculate variance
      const tokenDifference = openAIUsage.totalTokens - localUsage.totalTokens;
      const costDifference = openAIUsage.totalCost - localUsage.totalCost;
      const accuracyPercentage = openAIUsage.totalTokens > 0 
        ? Math.max(0, 100 - Math.abs(tokenDifference / openAIUsage.totalTokens) * 100)
        : 100;

      const comparison: ComparisonMetrics = {
        localUsage,
        openAIUsage,
        variance: {
          tokenDifference,
          costDifference,
          accuracyPercentage
        },
        lastSyncTime: new Date().toISOString()
      };

      console.log('✅ Comparison metrics generated:', {
        localTokens: localUsage.totalTokens,
        openAITokens: openAIUsage.totalTokens,
        accuracy: `${accuracyPercentage.toFixed(1)}%`
      });

      return comparison;
    } catch (error) {
      console.error('❌ Failed to get comparison metrics:', error);
      throw error;
    }
  }

  /**
   * Sync local usage data with OpenAI's official data
   */
  static async syncWithOpenAI(
    teamId: string,
    timeRange?: { start: string; end: string }
  ): Promise<SyncReport> {
    try {
      console.log('🔄 Starting sync with OpenAI usage data...');

      const comparison = await this.getComparisonMetrics(teamId, timeRange);
      const discrepancies: SyncReport['discrepancies'] = [];

      // Compare daily breakdowns to identify discrepancies
      const localByDate = new Map<string, { tokens: number; cost: number }>();
      
      // Group local usage by date (this would require enhancing the base UsageTracker)
      // For now, we'll work with the aggregated data
      
      comparison.openAIUsage.dailyBreakdown.forEach(openAIDay => {
        const localDay = localByDate.get(openAIDay.date) || { tokens: 0, cost: 0 };
        
        if (Math.abs(openAIDay.tokens - localDay.tokens) > 100 || 
            Math.abs(openAIDay.cost - localDay.cost) > 0.01) {
          discrepancies.push({
            date: openAIDay.date,
            localTokens: localDay.tokens,
            openAITokens: openAIDay.tokens,
            localCost: localDay.cost,
            openAICost: openAIDay.cost
          });
        }
      });

      const report: SyncReport = {
        success: true,
        syncedRecords: comparison.openAIUsage.dailyBreakdown.length,
        discrepancies,
        totalVariance: {
          tokens: comparison.variance.tokenDifference,
          cost: comparison.variance.costDifference
        }
      };

      console.log('✅ Sync completed:', {
        syncedRecords: report.syncedRecords,
        discrepancies: report.discrepancies.length,
        totalVariance: report.totalVariance
      });

      return report;
    } catch (error) {
      console.error('❌ Failed to sync with OpenAI:', error);
      return {
        success: false,
        syncedRecords: 0,
        discrepancies: [],
        totalVariance: { tokens: 0, cost: 0 }
      };
    }
  }

  /**
   * Get real-time OpenAI usage data
   */
  static async getOpenAIUsageMetrics(
    timeRange?: { start: string; end: string }
  ): Promise<OpenAIOrganizationUsage> {
    try {
      const apiKey = this.getOpenAIApiKey();
      
      const endTime = timeRange?.end || new Date().toISOString();
      const startTime = timeRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      return await OpenAIUsageService.getOrganizationUsage(apiKey, startTime, endTime);
    } catch (error) {
      console.error('❌ Failed to get OpenAI usage metrics:', error);
      throw error;
    }
  }

  /**
   * Validate OpenAI API key
   */
  static async validateOpenAIConnection(): Promise<boolean> {
    try {
      const apiKey = this.getOpenAIApiKey();
      return await OpenAIUsageService.validateApiKey(apiKey);
    } catch (error) {
      console.error('❌ OpenAI connection validation failed:', error);
      return false;
    }
  }

  /**
   * Get usage health check comparing local vs OpenAI data
   */
  static async getUsageHealthCheck(teamId: string): Promise<{
    status: 'healthy' | 'warning' | 'error';
    accuracy: number;
    lastSync: string;
    issues: string[];
  }> {
    try {
      const comparison = await this.getComparisonMetrics(teamId);
      const issues: string[] = [];
      
      if (comparison.variance.accuracyPercentage < 95) {
        issues.push(`Low accuracy: ${comparison.variance.accuracyPercentage.toFixed(1)}%`);
      }
      
      if (Math.abs(comparison.variance.costDifference) > 10) {
        issues.push(`High cost variance: $${comparison.variance.costDifference.toFixed(2)}`);
      }

      const status = issues.length === 0 ? 'healthy' : 
                    comparison.variance.accuracyPercentage > 90 ? 'warning' : 'error';

      return {
        status,
        accuracy: comparison.variance.accuracyPercentage,
        lastSync: comparison.lastSyncTime,
        issues
      };
    } catch (error) {
      return {
        status: 'error',
        accuracy: 0,
        lastSync: new Date().toISOString(),
        issues: ['Failed to connect to OpenAI API']
      };
    }
  }
}
