
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Heart, RefreshCw, Zap, Clock, Archive } from 'lucide-react';
import { ProductionQueueManager } from '@/services/workflow/ProductionQueueManager';
import { useToast } from '@/hooks/use-toast';

export const ProductionQueueDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const queueManager = ProductionQueueManager.getInstance();
      const queueStats = await queueManager.getProductionQueueStats();
      setStats(queueStats);
    } catch (error) {
      console.error('Error fetching production queue stats:', error);
    }
  };

  const handleStartQueue = async () => {
    setIsStarting(true);
    try {
      const queueManager = ProductionQueueManager.getInstance();
      await queueManager.startProductionQueue();
      await fetchStats();
      toast({
        title: "Production Queue Started",
        description: "All reliability features are now active.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start production queue.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopQueue = async () => {
    setIsLoading(true);
    try {
      const queueManager = ProductionQueueManager.getInstance();
      await queueManager.stopProductionQueue();
      await fetchStats();
      toast({
        title: "Production Queue Stopped",
        description: "All processing has been halted.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to stop production queue.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerRecovery = async () => {
    setIsLoading(true);
    try {
      const queueManager = ProductionQueueManager.getInstance();
      await queueManager.triggerManualRecovery();
      await fetchStats();
      toast({
        title: "Recovery Triggered",
        description: "Manual recovery check completed.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to trigger recovery.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthIcon = (healthy: boolean) => {
    return healthy ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  const getHealthColor = (healthy: boolean) => {
    return healthy ? 'bg-green-500' : 'bg-red-500';
  };

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Production Queue Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading production queue statistics...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Production Queue Manager</h2>
          {getHealthIcon(stats.queueHealth?.healthy)}
        </div>
        <div className="flex gap-2">
          {!stats.isRunning ? (
            <Button
              onClick={handleStartQueue}
              disabled={isStarting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isStarting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Start Production Queue
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleStopQueue}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Stop Queue
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleTriggerRecovery}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Trigger Recovery
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${stats.isRunning ? 'bg-green-500' : 'bg-red-500'}`} />
              Queue Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.isRunning ? 'Running' : 'Stopped'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.isRunning ? 'All systems operational' : 'Queue is stopped'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              Heartbeat Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.heartbeatStats?.activeJobs || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active jobs monitored
            </p>
            {stats.heartbeatStats?.jobsWithMissedBeats > 0 && (
              <p className="text-xs text-red-600">
                ⚠️ {stats.heartbeatStats.jobsWithMissedBeats} jobs with missed beats
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Archive className="h-4 w-4 text-orange-500" />
              Dead Letter Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deadLetterStats?.totalJobs || 0}</div>
            <p className="text-xs text-muted-foreground">Failed jobs archived</p>
            {stats.deadLetterStats?.recentFailures > 0 && (
              <p className="text-xs text-orange-600">
                {stats.deadLetterStats.recentFailures} recent failures
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Recovery System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.recoveryStatus?.isRunning ? 'Active' : 'Inactive'}
            </div>
            <p className="text-xs text-muted-foreground">
              Automatic recovery enabled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Queue Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Queue Health Assessment
            {getHealthIcon(stats.queueHealth?.healthy)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Health</span>
            <Badge variant={stats.queueHealth?.healthy ? "default" : "destructive"}>
              {stats.queueHealth?.healthy ? 'Healthy' : 'Issues Detected'}
            </Badge>
          </div>

          {stats.queueHealth?.starvedQueues?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-600">Starved Queues Detected</h4>
              <div className="space-y-1">
                {stats.queueHealth.starvedQueues.map((priority: number) => (
                  <Badge key={priority} variant="destructive" className="mr-2">
                    Priority {priority}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {stats.queueHealth?.recommendations?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Recommendations</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {stats.queueHealth.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dead Letter Queue Details */}
      {stats.deadLetterStats?.totalJobs > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dead Letter Queue Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Jobs by Type</h4>
                <div className="space-y-1">
                  {Object.entries(stats.deadLetterStats.jobsByType || {}).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span>{type}</span>
                      <span className="font-mono">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Recent Activity</h4>
                <p className="text-2xl font-bold text-red-600">
                  {stats.deadLetterStats.recentFailures}
                </p>
                <p className="text-xs text-muted-foreground">Failures in last 24h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
