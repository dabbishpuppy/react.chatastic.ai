
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { AgentHealth } from '@/services/rag/management/ragAgentLifecycle';

interface HealthOverviewProps {
  agentHealth: AgentHealth;
}

export const HealthOverview: React.FC<HealthOverviewProps> = ({ agentHealth }) => {
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Overall Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`flex items-center space-x-2 ${getHealthColor(agentHealth.overall)}`}>
            {getHealthIcon(agentHealth.overall)}
            <span className="text-lg font-semibold capitalize">{agentHealth.overall}</span>
          </div>
        </CardContent>
      </Card>

      {Object.entries(agentHealth.components).map(([component, status]) => (
        <Card key={component}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium capitalize">{component}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center space-x-2 ${getHealthColor(status)}`}>
              {getHealthIcon(status)}
              <span className="text-sm font-medium capitalize">{status}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
