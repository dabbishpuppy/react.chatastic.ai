
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceStatusCard } from './ServiceStatusCard';
import { SystemOverview } from './SystemOverview';
import { AlertsPanel } from './AlertsPanel';
import { QueueMonitor } from './QueueMonitor';
import { ProductionQueueDashboard } from './ProductionQueueDashboard';
import ProductionCrawlDashboard from './ProductionCrawlDashboard';
import { ProductionHealthCheck } from './ProductionHealthCheck';
import { DatabaseOptimizationDashboard } from './DatabaseOptimizationDashboard';
import { InfrastructureHealthMonitor } from './InfrastructureHealthMonitor';
import { CostMonitoringDashboard } from './CostMonitoringDashboard';
import { RAGSystemTestRunner } from '@/components/testing/RAGSystemTestRunner';
import { AgentManagementShortcuts } from './AgentManagementShortcuts';

interface DashboardTabsProps {
  orchestratorStatus: any;
  systemMetrics: any;
  alerts: any[];
  wsStats: any;
  selectedAgentId: string | null;
  onRestartService: (serviceName: string) => void;
  onAcknowledgeAlert: (alertId: string) => void;
  onDismissAlert: (alertId: string) => void;
}

export const DashboardTabs: React.FC<DashboardTabsProps> = ({
  orchestratorStatus,
  systemMetrics,
  alerts,
  wsStats,
  selectedAgentId,
  onRestartService,
  onAcknowledgeAlert,
  onDismissAlert
}) => {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="grid grid-cols-7 lg:grid-cols-13 w-full">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="health">Health Check</TabsTrigger>
        <TabsTrigger value="services">Services</TabsTrigger>
        <TabsTrigger value="testing">Testing</TabsTrigger>
        <TabsTrigger value="costs">Cost Monitoring</TabsTrigger>
        <TabsTrigger value="queue">Queue</TabsTrigger>
        <TabsTrigger value="production">Production Queue</TabsTrigger>
        <TabsTrigger value="production-crawl">Production Crawl</TabsTrigger>
        <TabsTrigger value="database">Database</TabsTrigger>
        <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
        <TabsTrigger value="websockets">WebSockets</TabsTrigger>
        <TabsTrigger value="alerts">Alerts</TabsTrigger>
        <TabsTrigger value="agent-management">Agent Mgmt</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SystemOverview 
              metrics={systemMetrics} 
              overallHealth={orchestratorStatus?.overallHealth || 0}
              selectedAgentId={selectedAgentId}
            />
          </div>
          <div>
            <AlertsPanel 
              alerts={alerts}
              onAcknowledge={onAcknowledgeAlert}
              onDismiss={onDismissAlert}
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
              onRestart={onRestartService}
            />
          ))}
          {(!orchestratorStatus?.services || orchestratorStatus.services.length === 0) && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No services found. Start the orchestrator to see service status.
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="testing" className="space-y-4">
        <RAGSystemTestRunner />
      </TabsContent>

      <TabsContent value="costs" className="space-y-4">
        <CostMonitoringDashboard 
          teamId="team-1" 
          agentId={selectedAgentId || undefined}
        />
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

      <TabsContent value="database" className="space-y-4">
        <DatabaseOptimizationDashboard />
      </TabsContent>

      <TabsContent value="infrastructure" className="space-y-4">
        <InfrastructureHealthMonitor />
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
          onAcknowledge={onAcknowledgeAlert}
          onDismiss={onDismissAlert}
        />
      </TabsContent>

      <TabsContent value="agent-management" className="space-y-4">
        {selectedAgentId ? (
          <Card>
            <CardHeader>
              <CardTitle>Agent Management - {selectedAgentId}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Quick agent management actions. For full management capabilities, 
                visit the dedicated agent management page.
              </p>
              <AgentManagementShortcuts selectedAgentId={selectedAgentId} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Agent Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Select an agent from the Agent Selector above to view management options.
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
};
