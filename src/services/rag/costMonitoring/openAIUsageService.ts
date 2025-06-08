
export interface OpenAIUsageData {
  n_requests: number;
  n_tokens: number;
  cost: number;
  timestamp: string;
}

export interface OpenAICostData {
  line_items: Array<{
    cost: number;
    model: string;
    timestamp: string;
  }>;
  total_cost: number;
}

export interface OpenAIOrganizationUsage {
  totalTokens: number;
  totalCost: number;
  dailyBreakdown: Array<{
    date: string;
    tokens: number;
    cost: number;
    requests: number;
  }>;
  modelBreakdown: Record<string, {
    tokens: number;
    cost: number;
    requests: number;
  }>;
}

export class OpenAIUsageService {
  private static readonly BASE_URL = 'https://api.openai.com/v1/organization';
  
  /**
   * Fetch organization usage data for completions
   */
  static async fetchCompletionsUsage(
    apiKey: string,
    startTime: string,
    endTime: string,
    interval: '1d' | '1h' = '1d'
  ): Promise<OpenAIUsageData[]> {
    try {
      const url = new URL(`${this.BASE_URL}/usage/completions`);
      url.searchParams.append('start_time', startTime);
      url.searchParams.append('end_time', endTime);
      url.searchParams.append('interval', interval);

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch OpenAI completions usage:', error);
      throw error;
    }
  }

  /**
   * Fetch organization costs data
   */
  static async fetchCosts(
    apiKey: string,
    startTime: string,
    endTime: string,
    interval: '1d' | '1h' = '1d'
  ): Promise<OpenAICostData> {
    try {
      const url = new URL(`${this.BASE_URL}/costs`);
      url.searchParams.append('start_time', startTime);
      url.searchParams.append('end_time', endTime);
      url.searchParams.append('interval', interval);

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Calculate total cost from line items
      const totalCost = data.line_items?.reduce((sum: number, item: any) => sum + (item.cost || 0), 0) || 0;
      
      return {
        line_items: data.line_items || [],
        total_cost: totalCost
      };
    } catch (error) {
      console.error('❌ Failed to fetch OpenAI costs:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive organization usage data
   */
  static async getOrganizationUsage(
    apiKey: string,
    startTime: string,
    endTime: string
  ): Promise<OpenAIOrganizationUsage> {
    try {
      console.log('🔍 Fetching OpenAI organization usage data...');

      // Fetch both usage and cost data in parallel
      const [usageData, costData] = await Promise.all([
        this.fetchCompletionsUsage(apiKey, startTime, endTime),
        this.fetchCosts(apiKey, startTime, endTime)
      ]);

      // Aggregate totals
      const totalTokens = usageData.reduce((sum, item) => sum + (item.n_tokens || 0), 0);
      const totalCost = costData.total_cost;

      // Create daily breakdown
      const dailyBreakdown = usageData.map(item => ({
        date: new Date(item.timestamp).toISOString().split('T')[0],
        tokens: item.n_tokens || 0,
        cost: item.cost || 0,
        requests: item.n_requests || 0
      }));

      // Create model breakdown from cost data
      const modelBreakdown: Record<string, { tokens: number; cost: number; requests: number }> = {};
      
      costData.line_items.forEach(item => {
        if (!modelBreakdown[item.model]) {
          modelBreakdown[item.model] = { tokens: 0, cost: 0, requests: 0 };
        }
        modelBreakdown[item.model].cost += item.cost || 0;
      });

      console.log('✅ OpenAI organization usage data fetched successfully:', {
        totalTokens,
        totalCost,
        dailyEntries: dailyBreakdown.length,
        models: Object.keys(modelBreakdown).length
      });

      return {
        totalTokens,
        totalCost,
        dailyBreakdown,
        modelBreakdown
      };
    } catch (error) {
      console.error('❌ Failed to get OpenAI organization usage:', error);
      throw error;
    }
  }

  /**
   * Validate API key by making a test request
   */
  static async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      await this.fetchCompletionsUsage(apiKey, startTime, endTime);
      return true;
    } catch (error) {
      console.error('❌ OpenAI API key validation failed:', error);
      return false;
    }
  }
}
