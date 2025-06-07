
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Play, Square, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';
import { ProductionCrawlOrchestrator } from '@/services/rag/enhanced/productionCrawlOrchestrator';
import { AtomicJobClaiming } from '@/services/rag/enhanced/atomicJobClaiming';

export const ProductionCrawlDashboard: React.FC = () => {
  const [orchestratorStatus, setOrchestratorStatus] = useState<any>(null);
  const [claimingStats, setClaimingStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    updateDashboard();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(updateDashboard, 5000); // Update every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const updateDashboard = async () => {
    try {
      const orchestrator = ProductionCrawlOrchestrator.getInstance();
      const [status, stats] = await Promise.all([
        orchestrator.getOrchestratorStatus(),
        AtomicJobClaiming.getClaimingStats()
      ]);

      setOrchestratorStatus(status);
      setClaimingStats(stats);
    } catch (error) {
      console.error('Error updating dashboard:', error);
    }
  };

  const handleStartOrchestrator = async () => {
    setIsLoading(true);
    try {
      const orchestrator = ProductionCrawlOrchestrator.getInstance();
      await orchestrator.startOrchestrator();
      await updateDashboard();
    } catch (error) {
      console.error('Error starting orchestrator:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopOrchestrator = async () => {
    setIsLoading(true);
    try {
      const orchestrator = ProductionCrawlOrchestrator.getInstance();
      await orchestrator.stopOrchestrator();
      await updateDashboard();
    } catch (error) {
      console.error('Error stopping orchestrator:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceRecovery = async () => {
    setIsLoading(true);
    try {
      const orchestrator = ProductionCrawlOrchestrator.getInstance();
      await orchestrator.forceRecovery();
      await updateDashboard();
    } catch (error) {
      console.error('Error forcing recovery:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergencyReset = async () => {
    if (!confirm('Are you sure you want to perform an emergency reset? This will reset all stuck jobs.')) {
      return;
    }

    setIsLoading(true);
    try {
      const orchestrator = ProductionCrawlOrchestrator.getInstance();
      await orchestrator.emergencyReset();
      await updateDashboard();
    } catch (error) {
      console.error('Error performing emergency reset:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Healthy</Badge>;
      case 'degraded':
        return <Badge variant="secondary" className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Degraded</Badge>;
      case 'critical':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Critical</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Production Crawl Dashboard</h2>
          <p className="text-muted-foreground">
            High-performance crawling system for 2000 simultaneous URLs
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={updateDashboard}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Orchestrator Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              {orchestratorStatus?.isRunning ? (
                <Badge variant="default" className="bg-green-500">
                  <Play className="h-3 w-3 mr-1" />
                  Running
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Square className="h-3 w-3 mr-1" />
                  Stopped
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              {orchestratorStatus?.isRunning ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStopOrchestrator}
                  disabled={isLoading}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleStartOrchestrator}
                  disabled={isLoading}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleForceRecovery}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Force Recovery
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEmergencyReset}
                disabled={isLoading}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Emergency Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Queue Health</CardTitle>
          </CardHeader>
          <CardContent>
            {orchestratorStatus?.queueMetrics ? 
              getHealthBadge(orchestratorStatus.queueMetrics.queueHealth) :
              <Badge variant="outline">Unknown</Badge>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {claimingStats?.pendingJobs || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Processing Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {claimingStats?.processingJobs || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orchestratorStatus?.queueMetrics?.throughput || 0}/hr
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Job Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            {claimingStats && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                    <div className="text-xl font-bold text-green-600">
                      {claimingStats.completedJobs}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                    <div className="text-xl font-bold text-red-600">
                      {claimingStats.failedJobs}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Avg Claim Time</div>
                    <div className="text-lg font-semibold">
                      {Math.round(claimingStats.avgClaimTime)}ms
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Conflict Rate</div>
                    <div className="text-lg font-semibold">
                      {Math.round(claimingStats.conflictRate * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {orchestratorStatus?.queueMetrics && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Avg Processing Time</div>
                    <div className="text-lg font-semibold">
                      {Math.round(orchestratorStatus.queueMetrics.avgProcessingTime)}ms
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Uptime</div>
                    <div className="text-lg font-semibold">
                      {orchestratorStatus.isRunning ? 
                        `${Math.round((Date.now() - orchestratorStatus.uptime) / 1000)}s` : 
                        'Stopped'
                      }
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground">Last Health Check</div>
                  <div className="text-sm">
                    {new Date(orchestratorStatus.lastHealthCheck).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
