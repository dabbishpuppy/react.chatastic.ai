
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Database, 
  Zap, 
  Clock, 
  Activity, 
  TrendingUp, 
  Settings,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { DatabaseOptimizationService } from '@/services/rag/enhanced/databaseOptimizationService';
import { useToast } from '@/hooks/use-toast';

export const DatabaseOptimizationDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [slowQueries, setSlowQueries] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [metricsData, slowQueriesData, healthData] = await Promise.all([
        DatabaseOptimizationService.getDatabaseMetrics(),
        DatabaseOptimizationService.analyzeSlowQueries(),
        DatabaseOptimizationService.getOptimizationHealth()
      ]);

      setMetrics(metricsData);
      setSlowQueries(slowQueriesData);
      setHealthStatus(healthData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load database optimization data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeDatabase = async () => {
    try {
      setIsOptimizing(true);
      const result = await DatabaseOptimizationService.optimizeDatabase();
      setOptimizationResult(result);
      
      toast({
        title: "Optimization Complete",
        description: `Applied ${result.actions.length} optimizations. Expected improvement: ${result.performanceImpact}%`,
      });

      await loadDashboardData();
    } catch (error) {
      console.error('Database optimization failed:', error);
      toast({
        title: "Optimization Failed",
        description: "Failed to optimize database. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Database Optimization</h2>
          <p className="text-muted-foreground">
            Monitor and optimize database performance in real-time
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleOptimizeDatabase}
            disabled={isOptimizing}
          >
            <Zap className={`h-4 w-4 mr-2 ${isOptimizing ? 'animate-pulse' : ''}`} />
            {isOptimizing ? 'Optimizing...' : 'Optimize Database'}
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Query Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.queryLatency?.avg?.toFixed(1) || 0}ms</div>
            <p className="text-xs text-muted-foreground">
              P95: {metrics?.queryLatency?.p95?.toFixed(1) || 0}ms • P99: {metrics?.queryLatency?.p99?.toFixed(1) || 0}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection Utilization</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.connectionUtilization?.toFixed(1) || 0}%</div>
            <Progress value={metrics?.connectionUtilization || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.cacheHitRate?.toFixed(1) || 0}%</div>
            <Progress value={metrics?.cacheHitRate || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthStatus?.score || 0}%</div>
            <Badge variant={healthStatus?.healthy ? 'default' : 'destructive'} className="mt-2">
              {healthStatus?.healthy ? 'Healthy' : 'Issues Detected'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Result */}
      {optimizationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Latest Optimization Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Performance Improvement:</span>
                <Badge variant="secondary">{optimizationResult.performanceImpact}%</Badge>
              </div>
              <div>
                <h4 className="font-medium mb-2">Actions Performed:</h4>
                <ul className="space-y-1">
                  {optimizationResult.actions.map((action: string, index: number) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="w-1 h-1 bg-primary rounded-full"></div>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Recommendations:</h4>
                <ul className="space-y-1">
                  {optimizationResult.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Tabs */}
      <Tabs defaultValue="slow-queries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="slow-queries">Slow Queries</TabsTrigger>
          <TabsTrigger value="health-check">Health Check</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="slow-queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Slow Query Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {slowQueries?.slowQueries?.length > 0 ? (
                <div className="space-y-4">
                  {slowQueries.slowQueries.map((query: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="destructive">
                          {query.avgTime}ms avg
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {query.frequency} executions
                        </span>
                      </div>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {query.query}
                      </pre>
                      <div>
                        <h5 className="font-medium text-sm mb-1">Suggestions:</h5>
                        <ul className="space-y-1">
                          {query.suggestions.map((suggestion: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No slow queries detected</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health-check" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Health Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Overall Health Score:</span>
                  <div className="flex items-center gap-2">
                    <Progress value={healthStatus?.score || 0} className="w-24" />
                    <span className="font-bold">{healthStatus?.score || 0}%</span>
                  </div>
                </div>

                {healthStatus?.issues?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-destructive">Issues Detected:</h4>
                    <ul className="space-y-1">
                      {healthStatus.issues.map((issue: string, index: number) => (
                        <li key={index} className="text-sm text-destructive flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {healthStatus?.recommendations?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Health Recommendations:</h4>
                    <ul className="space-y-1">
                      {healthStatus.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Overall Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {slowQueries?.overallRecommendations?.length > 0 ? (
                <ul className="space-y-2">
                  {slowQueries.overallRecommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      {rec}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No specific recommendations at this time</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
