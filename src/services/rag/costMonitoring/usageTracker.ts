
import { supabase } from "@/integrations/supabase/client";

export interface TokenUsage {
  teamId: string;
  agentId: string;
  provider: 'openai' | 'claude' | 'gemini';
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  timestamp: string;
}

export interface UsageMetrics {
  totalTokens: number;
  totalCost: number;
  byProvider: Record<string, { tokens: number; cost: number }>;
  byAgent: Record<string, { tokens: number; cost: number }>;
  timeRange: { start: string; end: string };
}

export class UsageTracker {
  private static readonly COST_PER_TOKEN = {
    'openai': {
      'gpt-4o': { input: 0.005 / 1000, output: 0.015 / 1000 },
      'gpt-4o-mini': { input: 0.00015 / 1000, output: 0.0006 / 1000 },
      'text-embedding-3-small': { input: 0.00002 / 1000, output: 0 }
    },
    'claude': {
      'claude-3-5-sonnet-20241022': { input: 0.003 / 1000, output: 0.015 / 1000 }
    },
    'gemini': {
      'gemini-1.5-pro': { input: 0.00125 / 1000, output: 0.005 / 1000 }
    }
  };

  /**
   * Track token usage for billing
   */
  static async trackTokenUsage(usage: Omit<TokenUsage, 'totalCost' | 'timestamp'>): Promise<void> {
    try {
      const cost = this.calculateCost(usage.provider, usage.model, usage.inputTokens, usage.outputTokens);
      
      const tokenUsage: TokenUsage = {
        ...usage,
        totalCost: cost,
        timestamp: new Date().toISOString()
      };

      // Store in audit table for billing
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          team_id: usage.teamId,
          agent_id: usage.agentId,
          action: 'token_usage',
          resource_type: 'llm_request',
          metadata: tokenUsage
        });

      if (error) {
        console.error('❌ Failed to track token usage:', error);
      } else {
        console.log(`📊 Tracked ${usage.inputTokens + usage.outputTokens} tokens ($${cost.toFixed(4)})`);
      }

    } catch (error) {
      console.error('❌ Error tracking token usage:', error);
    }
  }

  /**
   * Get usage metrics for a team/agent
   */
  static async getUsageMetrics(
    teamId: string, 
    agentId?: string, 
    timeRange?: { start: string; end: string }
  ): Promise<UsageMetrics> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('metadata, created_at')
        .eq('team_id', teamId)
        .eq('action', 'token_usage')
        .eq('resource_type', 'llm_request');

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      if (timeRange) {
        query = query.gte('created_at', timeRange.start).lte('created_at', timeRange.end);
      }

      const { data: usageData, error } = await query;

      if (error) {
        console.error('❌ Failed to fetch usage metrics:', error);
        return this.getEmptyMetrics(timeRange);
      }

      return this.aggregateUsageData(usageData || [], timeRange);

    } catch (error) {
      console.error('❌ Error getting usage metrics:', error);
      return this.getEmptyMetrics(timeRange);
    }
  }

  private static calculateCost(provider: string, model: string, inputTokens: number, outputTokens: number): number {
    const costs = this.COST_PER_TOKEN[provider as keyof typeof this.COST_PER_TOKEN];
    if (!costs || !costs[model as keyof typeof costs]) {
      console.warn(`⚠️ Unknown cost for ${provider}/${model}, using default`);
      return (inputTokens + outputTokens) * 0.001; // Default fallback
    }

    const modelCosts = costs[model as keyof typeof costs];
    return (inputTokens * modelCosts.input) + (outputTokens * modelCosts.output);
  }

  private static aggregateUsageData(data: any[], timeRange?: { start: string; end: string }): UsageMetrics {
    const metrics: UsageMetrics = {
      totalTokens: 0,
      totalCost: 0,
      byProvider: {},
      byAgent: {},
      timeRange: timeRange || { 
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      }
    };

    data.forEach(row => {
      const usage = row.metadata as TokenUsage;
      const tokens = usage.inputTokens + usage.outputTokens;

      metrics.totalTokens += tokens;
      metrics.totalCost += usage.totalCost;

      // By provider
      if (!metrics.byProvider[usage.provider]) {
        metrics.byProvider[usage.provider] = { tokens: 0, cost: 0 };
      }
      metrics.byProvider[usage.provider].tokens += tokens;
      metrics.byProvider[usage.provider].cost += usage.totalCost;

      // By agent
      if (!metrics.byAgent[usage.agentId]) {
        metrics.byAgent[usage.agentId] = { tokens: 0, cost: 0 };
      }
      metrics.byAgent[usage.agentId].tokens += tokens;
      metrics.byAgent[usage.agentId].cost += usage.totalCost;
    });

    return metrics;
  }

  private static getEmptyMetrics(timeRange?: { start: string; end: string }): UsageMetrics {
    return {
      totalTokens: 0,
      totalCost: 0,
      byProvider: {},
      byAgent: {},
      timeRange: timeRange || { 
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      }
    };
  }

  /**
   * Check if team is approaching usage limits
   */
  static async checkUsageLimits(teamId: string): Promise<{
    withinLimits: boolean;
    usage: UsageMetrics;
    warnings: string[];
  }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const usage = await this.getUsageMetrics(teamId, undefined, { start: monthStart, end: monthEnd });
    
    const warnings: string[] = [];
    let withinLimits = true;

    // Example limits - these would come from team settings
    const MONTHLY_COST_LIMIT = 100; // $100
    const MONTHLY_TOKEN_LIMIT = 1000000; // 1M tokens

    if (usage.totalCost > MONTHLY_COST_LIMIT * 0.8) {
      warnings.push(`Approaching monthly cost limit ($${usage.totalCost.toFixed(2)}/$${MONTHLY_COST_LIMIT})`);
    }

    if (usage.totalTokens > MONTHLY_TOKEN_LIMIT * 0.8) {
      warnings.push(`Approaching monthly token limit (${usage.totalTokens}/${MONTHLY_TOKEN_LIMIT})`);
    }

    if (usage.totalCost > MONTHLY_COST_LIMIT || usage.totalTokens > MONTHLY_TOKEN_LIMIT) {
      withinLimits = false;
    }

    return { withinLimits, usage, warnings };
  }
}
