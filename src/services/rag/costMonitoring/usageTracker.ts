

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
  [key: string]: any; // Add index signature for Json compatibility
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
  } as const;

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

      // Store in audit table with 'query' action using new_values field
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          agent_id: usage.agentId,
          action: 'query',
          resource_type: 'llm_request',
          new_values: tokenUsage as any // Cast to any for Json compatibility
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
   * Get usage metrics for a specific provider
   */
  static async getProviderUsageMetrics(
    teamId: string,
    provider: 'openai' | 'claude' | 'gemini',
    agentId?: string,
    timeRange?: { start: string; end: string }
  ): Promise<UsageMetrics> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('new_values, created_at')
        .eq('action', 'query')
        .eq('resource_type', 'llm_request');

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      if (timeRange) {
        query = query.gte('created_at', timeRange.start).lte('created_at', timeRange.end);
      }

      const { data: usageData, error } = await query;

      if (error) {
        console.error('❌ Failed to fetch provider usage metrics:', error);
        return this.getEmptyMetrics(timeRange);
      }

      // Filter by provider in the aggregation
      const filteredData = (usageData || []).filter(row => {
        const usage = row.new_values as unknown as TokenUsage;
        return usage && typeof usage === 'object' && usage.provider === provider;
      });

      return this.aggregateUsageData(filteredData, timeRange);

    } catch (error) {
      console.error('❌ Error getting provider usage metrics:', error);
      return this.getEmptyMetrics(timeRange);
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
        .select('new_values, created_at')
        .eq('action', 'query')
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
    type Provider = keyof typeof this.COST_PER_TOKEN;
    type CostStructure = { input: number; output: number };
    
    if (!(provider in this.COST_PER_TOKEN)) {
      console.warn(`⚠️ Unknown provider ${provider}, using default`);
      return (inputTokens + outputTokens) * 0.001; // Default fallback
    }

    const providerCosts = this.COST_PER_TOKEN[provider as Provider];
    
    if (!(model in providerCosts)) {
      console.warn(`⚠️ Unknown model ${model} for provider ${provider}, using default`);
      return (inputTokens + outputTokens) * 0.001; // Default fallback
    }

    const modelCosts = providerCosts[model as keyof typeof providerCosts] as CostStructure;
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
      const usage = row.new_values as unknown as TokenUsage;
      if (!usage || typeof usage !== 'object' || !usage.inputTokens || !usage.outputTokens) return;
      
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

