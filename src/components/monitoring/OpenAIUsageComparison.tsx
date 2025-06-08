
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EnhancedUsageTracker, type ComparisonMetrics } from '@/services/rag/costMonitoring/enhancedUsageTracker';
import { Sync, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';

interface OpenAIUsageComparisonProps {
  teamId: string;
  apiKey?: string;
}

export const OpenAIUsageComparison: React.FC<OpenAIUsageComparisonProps> = ({
  teamId,
  apiKey
}) => {
  const [comparison, setComparison] = useState<ComparisonMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    if (apiKey) {
      EnhancedUsageTracker.setOpenAIApiKey(apiKey);
      setIsConfigured(true);
      loadComparison();
    }
  }, [apiKey, teamId]);

  const loadComparison = async () => {
    if (!isConfigured) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const comparisonData = await EnhancedUsageTracker.getComparisonMetrics(teamId);
      setComparison(comparisonData);
    } catch (err) {
      console.error('Failed to load OpenAI comparison:', err);
      setError(err instanceof Error ? err.message : 'Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!isConfigured) return;
    
    try {
      setLoading(true);
      const syncReport = await EnhancedUsageTracker.syncWithOpenAI(teamId);
      
      if (syncReport.success) {
        await loadComparison(); // Reload after sync
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setLoading(false);
    }
  };

  const getAccuracyBadgeVariant = (accuracy: number) => {
    if (accuracy >= 95) return 'default';
    if (accuracy >= 90) return 'secondary';
    return 'destructive';
  };

  const getAccuracyLabel = (accuracy: number) => {
    if (accuracy >= 95) return 'Excellent';
    if (accuracy >= 90) return 'Good';
    if (accuracy >= 80) return 'Fair';
    return 'Poor';
  };

  if (!isConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            OpenAI Usage Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              OpenAI API key required to compare with official usage data.
              Configure your OpenAI API key to enable real-time comparison.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading && !comparison) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            OpenAI Usage Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            OpenAI Usage Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={loadComparison} className="mt-4" disabled={loading}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!comparison) {
    return null;
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(4)}`;
  const formatNumber = (num: number) => num.toLocaleString();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            OpenAI Usage Comparison
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getAccuracyBadgeVariant(comparison.variance.accuracyPercentage)}>
              {getAccuracyLabel(comparison.variance.accuracyPercentage)} ({comparison.variance.accuracyPercentage.toFixed(1)}%)
            </Badge>
            <Button 
              onClick={handleSync} 
              size="sm" 
              variant="outline"
              disabled={loading}
            >
              <Sync className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Sync
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Local Tracking */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground">Local Tracking</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Tokens:</span>
                <span className="font-mono">{formatNumber(comparison.localUsage.totalTokens)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Cost:</span>
                <span className="font-mono">{formatCurrency(comparison.localUsage.totalCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>Providers:</span>
                <span>{Object.keys(comparison.localUsage.byProvider).length}</span>
              </div>
            </div>
          </div>

          {/* OpenAI Official */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground">OpenAI Official</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Tokens:</span>
                <span className="font-mono">{formatNumber(comparison.openAIUsage.totalTokens)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Cost:</span>
                <span className="font-mono">{formatCurrency(comparison.openAIUsage.totalCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>Models:</span>
                <span>{Object.keys(comparison.openAIUsage.modelBreakdown).length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Variance Display */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="font-semibold text-sm text-muted-foreground mb-3">Variance Analysis</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`text-lg font-bold ${
                Math.abs(comparison.variance.tokenDifference) < 1000 ? 'text-green-600' : 'text-orange-600'
              }`}>
                {comparison.variance.tokenDifference > 0 ? '+' : ''}{formatNumber(comparison.variance.tokenDifference)}
              </div>
              <p className="text-xs text-muted-foreground">Token Difference</p>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${
                Math.abs(comparison.variance.costDifference) < 1 ? 'text-green-600' : 'text-orange-600'
              }`}>
                {comparison.variance.costDifference > 0 ? '+' : ''}{formatCurrency(comparison.variance.costDifference)}
              </div>
              <p className="text-xs text-muted-foreground">Cost Difference</p>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${
                comparison.variance.accuracyPercentage >= 95 ? 'text-green-600' : 
                comparison.variance.accuracyPercentage >= 90 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {comparison.variance.accuracyPercentage.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">Accuracy</p>
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          Last synced: {new Date(comparison.lastSyncTime).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
};
