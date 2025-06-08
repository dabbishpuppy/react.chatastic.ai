
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical';
}

interface AgentSelectorProps {
  selectedAgentId: string | null;
  onAgentSelect: (agentId: string | null) => void;
}

// Mock agent data - in real implementation, this would come from a service
const mockAgents: Agent[] = [
  { id: "1", name: "Wonder AI", status: "healthy" },
  { id: "2", name: "Agora AI", status: "healthy" },
  { id: "3", name: "PristineBag AI", status: "warning" },
  { id: "4", name: "AI Kundeservice", status: "healthy" },
  { id: "5", name: "theballooncompany.com", status: "healthy" }
];

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  selectedAgentId,
  onAgentSelect
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Agent Selection
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Select 
            value={selectedAgentId || 'all'} 
            onValueChange={(value) => onAgentSelect(value === 'all' ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an agent or view all" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents (Global View)</SelectItem>
              {mockAgents.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{agent.name}</span>
                    <span className={`ml-2 text-xs ${getStatusColor(agent.status)}`}>
                      {agent.status}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedAgentId && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">
                Selected Agent: {mockAgents.find(a => a.id === selectedAgentId)?.name}
              </div>
              <div className={`text-xs ${getStatusColor(mockAgents.find(a => a.id === selectedAgentId)?.status || 'healthy')}`}>
                Status: {mockAgents.find(a => a.id === selectedAgentId)?.status}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
