
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Play, Square, Settings } from 'lucide-react';
import { ServiceOrchestrator } from '@/services/rag/enhanced/serviceOrchestrator';
import { MetricsCollectionService } from '@/services/rag/enhanced/metricsCollectionService';
import { AlertingService } from '@/services/rag/enhanced/alertingService';
import { ServiceStatusCard } from './ServiceStatusCard';
import { SystemOverview } from './SystemOverview';
import { AlertsPanel } from './AlertsPanel';

export const MonitoringDashboard: React.FC = () => {
  const [orchestratorStatus, setOrchestratorStatus] = useState<any>(null);
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Initialize orchestrator
  useEffect(() => {
    const orchestrator = ServiceOrchestrator.getInstance();
    updateDashboard();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(updateDashboard, 10000); // Update every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const updateDashboard = async () => {
    try {
      const orchestrator = ServiceOrchestrator.getInstance();
      const status = orchestrator.getOrchestratorStatus();
      const metrics = MetricsCollectionService.getCurrentMetrics();
      const activeAlerts = AlertingService.getActiveAlerts();

      setOrchestratorStatus(status);
      setSystemMetrics(metrics.system);
      setAlerts(activeAlerts);
    } catch (error) {
      console.error('Error updating dashboard:', error);
    }
  };

  const handleStartServices = async () => {
    setIsLoading(true);
    try {
      const orchestrator = ServiceOrchestrator.getInstance();
      await orchestrator.startServices();
      await updateDashboard();
    } catch (error) {
      console.error('Error starting services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopServices = async () => {
    setIsLoading(true);
    try {
      const orchestrator = ServiceOrchestrator.getInstance();
      await orchestrator.stopServices();
      await updateDashboard();
    } catch (error) {
      console.error('Error stopping services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestartService = async (serviceName: string) => {
    try {
      const orchestrator = ServiceOrchestrator.getInstance();
      await orchestrator.restartService(serviceName);
      await updateDashboard();
    } catch (error) {
      console.error('Error restarting service:', error);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await AlertingService.acknowledgeAlert(alertId);
      await updateDashboard();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      await AlertingService.dismissAlert(alertId);
      await updateDashboard();
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Services Monitor</h1>
          <p className="text-muted-foreground">
            Real-time monitoring and management of enhanced RAG services
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
            <Settings className="h-5 w-5" />
            Service Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              <Button
                onClick={handleStartServices}
                disabled={isLoading || orchestratorStatus?.isRunning}
                size="sm"
              >
                <Play className="h-4 w-4 mr-2" />
                Start All Services
              </Button>
              <Button
                variant="destructive"
                onClick={handleStopServices}
                disabled={isLoading || !orchestratorStatus?.isRunning}
                size="sm"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop All Services
              </Button>
            </div>
            
            {orchestratorStatus && (
              <div className="flex items-center gap-4 text-sm">
                <div>
                  Status: <span className={orchestratorStatus.isRunning ? 'text-green-600' : 'text-red-600'}>
                    {orchestratorStatus.isRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>
                <div>
                  Uptime: {Math.floor(orchestratorStatus.uptime / 60)}m {orchestratorStatus.uptime % 60}s
                </div>
                <div>
                  Health: <span className="font-medium">{orchestratorStatus.overallHealth}%</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SystemOverview 
                metrics={systemMetrics} 
                overallHealth={orchestratorStatus?.overallHealth || 0}
              />
            </div>
            <div>
              <AlertsPanel 
                alerts={alerts}
                onAcknowledge={handleAcknowledgeAlert}
                onDismiss={handleDismissAlert}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orchestratorStatus?.services?.map((service: any) => (
              <ServiceStatusCard
                key={service.name}
                service={service}
                onRestart={handleRestartService}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <AlertsPanel 
            alerts={alerts}
            onAcknowledge={handleAcknowledgeAlert}
            onDismiss={handleDismissAlert}
          />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SystemOverview 
              metrics={systemMetrics} 
              overallHealth={orchestratorStatus?.overallHealth || 0}
            />
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {systemMetrics ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{systemMetrics.errorRate?.toFixed(1) || 0}%</div>
                        <p className="text-xs text-muted-foreground">Error Rate</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{systemMetrics.throughput?.toFixed(1) || 0}</div>
                        <p className="text-xs text-muted-foreground">Throughput</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Loading metrics...</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
