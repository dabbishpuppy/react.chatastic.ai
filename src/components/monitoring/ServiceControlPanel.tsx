
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Square, Settings } from 'lucide-react';

interface ServiceControlPanelProps {
  orchestratorStatus: any;
  isLoading: boolean;
  onStartServices: () => void;
  onStopServices: () => void;
}

export const ServiceControlPanel: React.FC<ServiceControlPanelProps> = ({
  orchestratorStatus,
  isLoading,
  onStartServices,
  onStopServices
}) => {
  return (
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
              onClick={onStartServices}
              disabled={isLoading || orchestratorStatus?.isRunning}
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              Start All Services
            </Button>
            <Button
              variant="destructive"
              onClick={onStopServices}
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
  );
};
