
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, RotateCcw } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime: number;
  lastCheck: string;
  health: number;
}

interface ServiceStatusCardProps {
  service: ServiceStatus;
  onRestart?: (serviceName: string) => void;
}

export const ServiceStatusCard: React.FC<ServiceStatusCardProps> = ({ 
  service, 
  onRestart 
}) => {
  const getStatusIcon = () => {
    switch (service.status) {
      case 'running':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'stopped':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (service.status) {
      case 'running':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'stopped':
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-green-600';
    if (health >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {getStatusIcon()}
          {service.name}
        </CardTitle>
        <Badge className={getStatusColor()}>
          {service.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Health:</span>
            <span className={`font-medium ${getHealthColor(service.health)}`}>
              {service.health}%
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Uptime:</span>
            <span className="font-medium">
              {formatUptime(service.uptime)}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last Check:</span>
            <span className="font-medium">
              {new Date(service.lastCheck).toLocaleTimeString()}
            </span>
          </div>

          {onRestart && service.status !== 'running' && (
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full mt-2"
              onClick={() => onRestart(service.name)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
