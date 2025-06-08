
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Server, 
  Database, 
  Network, 
  Gauge, 
  RefreshCw, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Settings
} from 'lucide-react';
import { useProductionInfrastructure } from '@/hooks/useProductionInfrastructure';

export const InfrastructureHealthMonitor: React.FC = () => {
  const {
    infrastructureHealth,
    systemHealth,
    loading,
    optimizeInfrastructure,
    loadInfrastructureHealth,
    loadSystemHealth
  } = useProductionInfrastructure();

  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimizeInfrastructure = async () => {
    try {
      setIsOptimizing(true);
      await optimizeInfrastructure();
    } catch (error) {
      console.error('Infrastructure optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthStatus = (score: number) => {
    if (score >= 80) return 'Healthy';
    if (score >= 60) return 'Degraded';
    return 'Critical';
  };

  const handleRefresh = () => {
    loadInfrastructureHealth();
    loadSystemHealth();
  };

  if (loading && !infrastructureHealth) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
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
          <h2 className="text-3xl font-bold">Infrastructure Health</h2>
          <p className="text-muted-foreground">
            Monitor system infrastructure and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleOptimizeInfrastructure}
            disabled={isOptimizing}
          >
            <Settings className={`h-4 w-4 mr-2 ${isOptimizing ? 'animate-pulse' : ''}`} />
            {isOptimizing ? 'Optimizing...' : 'Optimize Infrastructure'}
          </Button>
        </div>
      </div>

      {/* Overall Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Overall Infrastructure Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-4xl font-bold ${getHealthColor(infrastructureHealth?.healthPercentage || 0)}`}>
                {infrastructureHealth?.healthPercentage || 0}%
              </div>
              <Badge 
                variant={infrastructureHealth?.healthy ? 'default' : 'destructive'}
                className="mt-2"
              >
                {getHealthStatus(infrastructureHealth?.healthPercentage || 0)}
              </Badge>
            </div>
            <div className="w-32">
              <Progress 
                value={infrastructureHealth?.healthPercentage || 0} 
                className="h-3"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Infrastructure Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Rate Limiting */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limiting</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Customers</span>
                <span className="font-bold">{infrastructureHealth?.rateLimiting?.activeCustomers || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Avg Usage</span>
                <span className="font-bold">{infrastructureHealth?.rateLimiting?.avgUsagePercent || 0}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Throttled</span>
                <span className="font-bold text-red-600">{infrastructureHealth?.rateLimiting?.throttledRequests || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connection Pools */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection Pools</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Health Score</span>
                <span className={`font-bold ${getHealthColor(infrastructureHealth?.connectionPools?.healthScore || 0)}`}>
                  {infrastructureHealth?.connectionPools?.healthScore || 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Connections</span>
                <span className="font-bold">{infrastructureHealth?.connectionPools?.activeConnections || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Queued Requests</span>
                <span className="font-bold">{infrastructureHealth?.connectionPools?.queuedRequests || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Partitioning */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Partitioning</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Health Score</span>
                <span className={`font-bold ${getHealthColor(infrastructureHealth?.partitioning?.healthScore || 0)}`}>
                  {infrastructureHealth?.partitioning?.healthScore || 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Balanced Tables</span>
                <span className="font-bold">{infrastructureHealth?.partitioning?.balancedTables || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Hot Spots</span>
                <span className="font-bold text-orange-600">{infrastructureHealth?.partitioning?.hotSpots || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Details */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              System Health Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Service Status</h4>
                <div className="space-y-2">
                  {systemHealth.services?.map((service: any) => (
                    <div key={service.name} className="flex items-center justify-between">
                      <span className="text-sm">{service.name}</span>
                      <Badge variant={service.healthy ? 'default' : 'destructive'}>
                        {service.healthy ? 'Healthy' : 'Issues'}
                      </Badge>
                    </div>
                  )) || (
                    <p className="text-muted-foreground text-sm">No service data available</p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Performance Metrics</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Response Time</span>
                    <span className="font-mono text-sm">{systemHealth.responseTime || 0}ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Throughput</span>
                    <span className="font-mono text-sm">{systemHealth.throughput || 0} req/s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Error Rate</span>
                    <span className="font-mono text-sm">{systemHealth.errorRate || 0}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {systemHealth?.alerts && systemHealth.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {systemHealth.alerts.map((alert: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">{alert.message}</span>
                  </div>
                  <Badge variant="outline">{alert.severity}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
