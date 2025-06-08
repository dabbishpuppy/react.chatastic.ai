
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Agent {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical';
}

interface AgentSelectorProps {
  selectedAgentId: string | null;
  onAgentSelect: (agentId: string | null) => void;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  selectedAgentId,
  onAgentSelect
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const { data: agentsData, error } = await supabase
        .from('agents')
        .select('id, name, status')
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.error('Error fetching agents:', error);
        return;
      }

      // Transform the data to include health status based on agent status
      const transformedAgents: Agent[] = (agentsData || []).map(agent => ({
        id: agent.id,
        name: agent.name,
        status: getHealthStatus(agent.status)
      }));

      setAgents(transformedAgents);
    } catch (error) {
      console.error('Error in fetchAgents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatus = (status: string): 'healthy' | 'warning' | 'critical' => {
    switch (status) {
      case 'active':
        return 'healthy';
      case 'inactive':
        return 'warning';
      case 'error':
        return 'critical';
      default:
        return 'healthy';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Agent Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-10 bg-muted rounded-md"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
              {agents.map(agent => (
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

          {selectedAgentId && selectedAgent && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">
                Selected Agent: {selectedAgent.name}
              </div>
              <div className={`text-xs ${getStatusColor(selectedAgent.status)}`}>
                Status: {selectedAgent.status}
              </div>
            </div>
          )}

          {agents.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No agents found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
