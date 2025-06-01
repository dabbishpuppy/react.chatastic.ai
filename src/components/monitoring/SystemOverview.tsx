
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, Cpu, HardDrive, Wifi, Users } from 'lucide-react';

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  activeConnections: number;
  queueLength: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
}

interface SystemOverviewProps {
  metrics: SystemMetrics | null;
  overallHealth: number;
}

export const SystemOverview: React.FC<SystemOverviewProps> = ({ 
  metrics, 
  overallHealth 
}) => {
  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading system metrics...</p>
        </CardContent>
      </Card>
    );
  }

  const getHealthColor = (value: number) => {
    if (value >= 90) return 'text-green-600';
    if (value >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (value: number) => {
    if (value <= 70) return 'bg-green-500';
    if (value <= 85) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Health */}
        <div className="text-center">
          <div className={`text-3xl font-bold ${getHealthColor(overallHealth)}`}>
            {overallHealth}%
          </div>
          <p className="text-sm text-muted-foreground">Overall Health</p>
        </div>

        {/* Resource Usage */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              <span className="text-sm">CPU Usage</span>
            </div>
            <span className="text-sm font-medium">{metrics.cpuUsage.toFixed(1)}%</span>
          </div>
          <Progress 
            value={metrics.cpuUsage} 
            className="h-2" 
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="text-sm">Memory Usage</span>
            </div>
            <span className="text-sm font-medium">{metrics.memoryUsage.toFixed(1)}%</span>
          </div>
          <Progress 
            value={metrics.memoryUsage} 
            className="h-2" 
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm">Disk Usage</span>
            </div>
            <span className="text-sm font-medium">{metrics.diskUsage.toFixed(1)}%</span>
          </div>
          <Progress 
            value={metrics.diskUsage} 
            className="h-2" 
          />
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {metrics.responseTime.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">Response Time</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold">
              {metrics.throughput.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">Throughput/sec</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold">
              {metrics.activeConnections}
            </div>
            <p className="text-xs text-muted-foreground">Active Connections</p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold">
              {metrics.queueLength}
            </div>
            <p className="text-xs text-muted-foreground">Queue Length</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
