
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UsageTracker, type UsageMetrics } from '@/services/rag/costMonitoring/usageTracker';
import { DollarSign, Zap, AlertTriangle, TrendingUp, Filter } from 'lucide-react';

interface CostMonitoringDashboardProps {
  teamId: string;
  agentId?: string;
}

type Provider = 'all' | 'openai' | 'claude' | 'gemini';

export const CostMonitoringDashboard: React.FC<CostMonitoringDashboardProps> = ({
  teamId,
  agentId
}) => {
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<Provider>('all');

  useEffect(() => {
    loadUsageData();
    const interval = setInterval(loadUsageData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [teamId, agentId, selectedProvider]);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      
      let metrics: UsageMetrics;
      
      if (selectedProvider === 'all') {
        // Get overall metrics
        metrics = await UsageTracker.getUsageMetrics(teamId, agentId);
      } else {
        // Get provider-specific metrics
        metrics = await UsageTracker.getProviderUsageMetrics(teamId, selectedProvider, agentId);
      }
      
      setUsageMetrics(metrics);

      // Check usage limits (only for overall usage)
      if (selectedProvider === 'all') {
        const { warnings: usageWarnings } = await UsageTracker.checkUsageLimits(teamId);
        setWarnings(usageWarnings);
      } else {
        setWarnings([]);
      }

    } catch (error) {
      console.error('❌ Failed to load usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProviderDisplayName = (provider: Provider) => {
    switch (provider) {
      case 'openai': return 'OpenAI';
      case 'claude': return 'Anthropic (Claude)';
      case 'gemini': return 'Google (Gemini)';
      case 'all': return 'All Providers';
      default: return provider;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filter by Provider:</span>
          </div>
          <div className="animate-pulse bg-muted rounded w-32 h-8"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!usageMetrics) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load usage metrics. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(4)}`;
  const formatNumber = (num: number) => num.toLocaleString();

  return (
    <div className="space-y-6">
      {/* Provider Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filter by Provider:</span>
        </div>
        <Select value={selectedProvider} onValueChange={(value: Provider) => setSelectedProvider(value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="claude">Anthropic (Claude)</SelectItem>
            <SelectItem value="gemini">Google (Gemini)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alerts */}
      {warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {warnings.map((warning, index) => (
                <div key={index}>{warning}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(usageMetrics.totalCost)}</div>
            <p className="text-xs text-muted-foreground">
              {selectedProvider === 'all' ? 'All providers' : getProviderDisplayName(selectedProvider)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(usageMetrics.totalTokens)}</div>
            <p className="text-xs text-muted-foreground">Input + Output</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost/Token</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageMetrics.totalTokens > 0 
                ? formatCurrency(usageMetrics.totalCost / usageMetrics.totalTokens)
                : '$0.0000'
              }
            </div>
            <p className="text-xs text-muted-foreground">Per token</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {selectedProvider === 'all' ? 'Active Providers' : 'Models Used'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selectedProvider === 'all' 
                ? Object.keys(usageMetrics.byProvider).length
                : Object.keys(usageMetrics.byProvider).length
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedProvider === 'all' ? 'Providers' : 'Models'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Provider/Model Breakdown */}
      {selectedProvider === 'all' ? (
        // Show provider breakdown when viewing all
        <Card>
          <CardHeader>
            <CardTitle>Usage by Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(usageMetrics.byProvider).map(([provider, data]) => {
                const percentage = usageMetrics.totalCost > 0 
                  ? (data.cost / usageMetrics.totalCost) * 100 
                  : 0;
                
                return (
                  <div key={provider} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{getProviderDisplayName(provider as Provider)}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatNumber(data.tokens)} tokens
                        </span>
                      </div>
                      <span className="font-medium">{formatCurrency(data.cost)}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
              {Object.keys(usageMetrics.byProvider).length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No usage data available for the selected time period.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        // Show model breakdown for specific provider
        usageMetrics.totalCost > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{getProviderDisplayName(selectedProvider)} Usage Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{formatCurrency(usageMetrics.totalCost)}</div>
                  <p className="text-muted-foreground">Total spent on {getProviderDisplayName(selectedProvider)}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-xl font-semibold">{formatNumber(usageMetrics.totalTokens)}</div>
                    <p className="text-sm text-muted-foreground">Total tokens</p>
                  </div>
                  <div>
                    <div className="text-xl font-semibold">
                      {usageMetrics.totalTokens > 0 
                        ? formatCurrency(usageMetrics.totalCost / usageMetrics.totalTokens)
                        : '$0.0000'
                      }
                    </div>
                    <p className="text-sm text-muted-foreground">Average cost per token</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Agent Breakdown (if showing team-wide data) */}
      {!agentId && Object.keys(usageMetrics.byAgent).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Usage by Agent 
              {selectedProvider !== 'all' && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({getProviderDisplayName(selectedProvider)} only)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(usageMetrics.byAgent)
                .sort(([,a], [,b]) => b.cost - a.cost)
                .slice(0, 10) // Show top 10 agents
                .map(([agentId, data]) => {
                  const percentage = usageMetrics.totalCost > 0 
                    ? (data.cost / usageMetrics.totalCost) * 100 
                    : 0;
                  
                  return (
                    <div key={agentId} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {agentId.slice(0, 8)}...
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatNumber(data.tokens)} tokens
                          </span>
                        </div>
                        <span className="font-medium">{formatCurrency(data.cost)}</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CostMonitoringDashboard;
