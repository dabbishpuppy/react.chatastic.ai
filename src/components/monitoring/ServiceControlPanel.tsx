
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Play, Square, Settings, ChevronDown } from 'lucide-react';

interface ServiceControlPanelProps {
  orchestratorStatus: any;
  isLoading: boolean;
  onStartServices: () => void;
  onStopServices: () => void;
  selectedView: string;
  onViewChange: (view: string) => void;
}

const viewOptions = [
  { value: 'overview', label: 'Overview' },
  { value: 'health', label: 'Health Check' },
  { value: 'services', label: 'Services' },
  { value: 'testing', label: 'Testing' },
  { value: 'costs', label: 'Cost Monitoring' },
  { value: 'queue', label: 'Queue' },
  { value: 'production', label: 'Production Queue' },
  { value: 'production-crawl', label: 'Production Crawl' },
  { value: 'database', label: 'Database' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'websockets', label: 'WebSockets' },
  { value: 'alerts', label: 'Alerts' },
  { value: 'agent-management', label: 'Agent Management' }
];

export const ServiceControlPanel: React.FC<ServiceControlPanelProps> = ({
  orchestratorStatus,
  isLoading,
  onStartServices,
  onStopServices,
  selectedView,
  onViewChange
}) => {
  const currentView = viewOptions.find(option => option.value === selectedView);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Service Control & Monitoring
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Service Control Buttons */}
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

          {/* View Selector Dropdown */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">View:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  {currentView?.label || 'Select View'}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-background border shadow-lg">
                {viewOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => onViewChange(option.value)}
                    className={selectedView === option.value ? 'bg-accent' : ''}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
