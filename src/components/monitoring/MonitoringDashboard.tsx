
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw } from 'lucide-react';
import { ServiceOrchestrator } from '@/services/rag/enhanced/serviceOrchestrator';
import { MetricsCollectionService } from '@/services/rag/enhanced/metricsCollectionService';
import { AlertingService } from '@/services/rag/enhanced/alertingService';
import { WebSocketRealtimeService } from '@/services/workflow/WebSocketRealtimeService';
import { ServiceStatusCard } from './ServiceStatusCard';
import { SystemOverview } from './SystemOverview';
import { AlertsPanel } from './AlertsPanel';
import { ServiceControlPanel } from './ServiceControlPanel';
import { QueueMonitor } from './QueueMonitor';
import { ProductionQueueDashboard } from './ProductionQueueDashboard';
import { ProductionCrawlDashboard } from './ProductionCrawlDashboard';
import { ProductionHealthCheck } from './ProductionHealthCheck';

export const MonitoringDashboard: React.FC = () => {
  const [orchestratorStatus, setOrchestratorStatus] = useState<any>(null);
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [wsStats, setWsStats] = useState<any>(null);
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
      const webSocketStats = WebSocketRealtimeService.getStats();

      setOrchestratorStatus(status);
      setSystemMetrics(metrics.system);
      setAlerts(activeAlerts);
      setWsStats(webSocketStats);
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
      await AlertingService.acknowledgeAlert(alertId, 'System Admin');
      await updateDashboard();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      await AlertingService.acknowledgeAlert(alertId, 'System Admin');
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
      <ServiceControlPanel
        orchestratorStatus={orchestratorStatus}
        isLoading={isLoading}
        onStartServices={handleStartServices}
        onStopServices={handleStopServices}
      />

      {/* Dashboard Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health">Health Check</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="production">Production Queue</TabsTrigger>
          <TabsTrigger value="production-crawl">Production Crawl</TabsTrigger>
          <TabsTrigger value="websockets">WebSockets</TabsTrigger>
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

        <TabsContent value="health" className="space-y-4">
          <ProductionHealthCheck />
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

        <TabsContent value="queue" className="space-y-4">
          <QueueMonitor />
        </TabsContent>

        <TabsContent value="production" className="space-y-4">
          <ProductionQueueDashboard />
        </TabsContent>

        <TabsContent value="production-crawl" className="space-y-4">
          <ProductionCrawlDashboard />
        </TabsContent>

        <TabsContent value="websockets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WebSocket Connections</CardTitle>
            </CardHeader>
            <CardContent>
              {wsStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{wsStats.activeConnections}</div>
                      <p className="text-xs text-muted-foreground">Active Connections</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{wsStats.totalListeners}</div>
                      <p className="text-xs text-muted-foreground">Total Listeners</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{Object.keys(wsStats.connectionsBySource || {}).length}</div>
                      <p className="text-xs text-muted-foreground">Sources Monitored</p>
                    </div>
                  </div>
                  
                  {Object.entries(wsStats.connectionsBySource || {}).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Connection Status by Source</h4>
                      <div className="space-y-1">
                        {Object.entries(wsStats.connectionsBySource || {}).map(([sourceId, status]) => (
                          <div key={sourceId} className="flex items-center justify-between text-sm">
                            <span className="font-mono text-xs">{sourceId.slice(0, 8)}...</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              status === 'connected' ? 'bg-green-100 text-green-800' :
                              status === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {status as string}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Loading WebSocket statistics...</p>
              )}
            </CardContent>
          </Card>
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
                        <div className="text-2xl font-bold">{systemMetrics.cpuUsage || 0}%</div>
                        <p className="text-xs text-muted-foreground">CPU Usage</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{systemMetrics.memoryUsage || 0}%</div>
                        <p className="text-xs text-muted-foreground">Memory Usage</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Loading performance metrics...</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
