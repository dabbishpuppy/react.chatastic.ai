
import React from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw } from 'lucide-react';

interface DashboardHeaderProps {
  orchestratorStatus: any;
  autoRefresh: boolean;
  isLoading: boolean;
  onToggleAutoRefresh: () => void;
  onManualRefresh: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  orchestratorStatus,
  autoRefresh,
  isLoading,
  onToggleAutoRefresh,
  onManualRefresh
}) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">Centralized Monitoring Dashboard</h1>
        <p className="text-muted-foreground">
          Complete system monitoring, testing, and agent management
        </p>
        {orchestratorStatus && (
          <p className="text-sm text-muted-foreground mt-1">
            Status: {orchestratorStatus.isRunning ? '🟢 Running' : '🔴 Stopped'} • 
            Uptime: {Math.floor(orchestratorStatus.uptime / 60)}m {orchestratorStatus.uptime % 60}s • 
            Health: {orchestratorStatus.overallHealth}%
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleAutoRefresh}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
          Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onManualRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
};
