
import React, { useState, useEffect, useCallback } from 'react';
import { ServiceOrchestrator } from '@/services/rag/enhanced/serviceOrchestrator';
import { MetricsCollectionService } from '@/services/rag/enhanced/metricsCollectionService';
import { AlertingService } from '@/services/rag/enhanced/alertingService';
import { WebSocketRealtimeService } from '@/services/workflow/WebSocketRealtimeService';
import { ServiceControlPanel } from './ServiceControlPanel';
import { DashboardHeader } from './DashboardHeader';
import { QuickActionsPanel } from './QuickActionsPanel';
import { DashboardTabs } from './DashboardTabs';
import { useToast } from '@/hooks/use-toast';

export const MonitoringDashboard: React.FC = () => {
  const [orchestratorStatus, setOrchestratorStatus] = useState<any>(null);
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [wsStats, setWsStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize orchestrator and load initial state
  const initializeOrchestrator = useCallback(() => {
    const orchestrator = ServiceOrchestrator.getInstance({
      enableMetrics: true,
      enableAlerting: true,
      enablePerformanceMonitoring: true,
      enableInfrastructureMonitoring: true,
      enableIPPoolMonitoring: true,
      enableEgressManagement: true,
      enableAutoscaling: true,
      enableWorkerQueue: true,
      enableConnectionPooling: true,
      enableDatabaseOptimization: true
    });
    
    // Load current status immediately
    updateDashboard();
    
    return orchestrator;
  }, []);

  useEffect(() => {
    const orchestrator = initializeOrchestrator();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        updateDashboard();
      }, 5000); // Update every 5 seconds for better responsiveness
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, initializeOrchestrator]);

  const updateDashboard = useCallback(async () => {
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
  }, []);

  const handleStartServices = async () => {
    setIsLoading(true);
    try {
      const orchestrator = ServiceOrchestrator.getInstance();
      await orchestrator.startServices();
      
      toast({
        title: "Services Started",
        description: "All enhanced services have been started successfully.",
      });
      
      await updateDashboard();
    } catch (error) {
      console.error('Error starting services:', error);
      toast({
        title: "Error Starting Services",
        description: "Failed to start services. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopServices = async () => {
    setIsLoading(true);
    try {
      const orchestrator = ServiceOrchestrator.getInstance();
      await orchestrator.stopServices();
      
      toast({
        title: "Services Stopped",
        description: "All enhanced services have been stopped.",
      });
      
      await updateDashboard();
    } catch (error) {
      console.error('Error stopping services:', error);
      toast({
        title: "Error Stopping Services",
        description: "Failed to stop services. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestartService = async (serviceName: string) => {
    try {
      const orchestrator = ServiceOrchestrator.getInstance();
      await orchestrator.restartService(serviceName);
      
      toast({
        title: "Service Restarted",
        description: `${serviceName} has been restarted successfully.`,
      });
      
      await updateDashboard();
    } catch (error) {
      console.error('Error restarting service:', error);
      toast({
        title: "Error Restarting Service",
        description: `Failed to restart ${serviceName}. Check console for details.`,
        variant: "destructive",
      });
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
      await AlertingService.acknowledgeAlert(alertId);
      await updateDashboard();
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  const handleManualRefresh = () => {
    updateDashboard();
    toast({
      title: "Dashboard Refreshed",
      description: "Latest metrics and status have been loaded.",
    });
  };

  const handleToggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <DashboardHeader
        orchestratorStatus={orchestratorStatus}
        autoRefresh={autoRefresh}
        isLoading={isLoading}
        onToggleAutoRefresh={handleToggleAutoRefresh}
        onManualRefresh={handleManualRefresh}
      />

      {/* Agent Selection and Quick Actions */}
      <QuickActionsPanel
        selectedAgentId={selectedAgentId}
        onAgentSelect={setSelectedAgentId}
      />

      {/* Control Panel */}
      <ServiceControlPanel
        orchestratorStatus={orchestratorStatus}
        isLoading={isLoading}
        onStartServices={handleStartServices}
        onStopServices={handleStopServices}
      />

      {/* Dashboard Content */}
      <DashboardTabs
        orchestratorStatus={orchestratorStatus}
        systemMetrics={systemMetrics}
        alerts={alerts}
        wsStats={wsStats}
        selectedAgentId={selectedAgentId}
        onRestartService={handleRestartService}
        onAcknowledgeAlert={handleAcknowledgeAlert}
        onDismissAlert={handleDismissAlert}
      />
    </div>
  );
};
