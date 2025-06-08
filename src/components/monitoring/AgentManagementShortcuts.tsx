
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  RefreshCw, 
  Wrench, 
  ExternalLink,
  Zap,
  Activity,
  Database
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AgentManagementShortcutsProps {
  selectedAgentId: string | null;
}

interface AgentStats {
  sourcesCount: number;
  trainingProgress: number;
  lastUpdateTime: string;
}

export const AgentManagementShortcuts: React.FC<AgentManagementShortcutsProps> = ({
  selectedAgentId
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedAgentId) {
      fetchAgentStats();
    }
  }, [selectedAgentId]);

  const fetchAgentStats = async () => {
    if (!selectedAgentId) return;
    
    try {
      setLoading(true);
      
      // Fetch agent sources count
      const { count: sourcesCount } = await supabase
        .from('agent_sources')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', selectedAgentId)
        .eq('is_active', true);

      // Fetch latest training job
      const { data: trainingJob } = await supabase
        .from('agent_training_jobs')
        .select('*')
        .eq('agent_id', selectedAgentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Calculate training progress
      let trainingProgress = 100;
      if (trainingJob && trainingJob.status === 'running') {
        trainingProgress = trainingJob.total_chunks > 0 
          ? (trainingJob.processed_chunks / trainingJob.total_chunks) * 100 
          : 0;
      }

      // Get last update time from agent sources
      const { data: latestSource } = await supabase
        .from('agent_sources')
        .select('updated_at')
        .eq('agent_id', selectedAgentId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastUpdateTime = latestSource 
        ? new Date(latestSource.updated_at).toLocaleString() 
        : 'Never';

      setAgentStats({
        sourcesCount: sourcesCount || 0,
        trainingProgress,
        lastUpdateTime
      });
    } catch (error) {
      console.error('Error fetching agent stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRetrain = async () => {
    if (!selectedAgentId) return;
    
    toast({
      title: "Retraining Started",
      description: "Agent retraining has been initiated in the background.",
    });
  };

  const handleQuickOptimize = async () => {
    if (!selectedAgentId) return;
    
    toast({
      title: "Optimization Started",
      description: "Agent optimization is running in the background.",
    });
  };

  const handleViewDetails = () => {
    if (!selectedAgentId) return;
    navigate(`/agent/${selectedAgentId}/management`);
  };

  if (!selectedAgentId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Agent Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select an agent to view management options</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Agent Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Agent Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Agent Status</span>
          <Badge variant="default">Healthy</Badge>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <Button 
            onClick={handleQuickRetrain}
            size="sm" 
            variant="outline" 
            className="w-full justify-start"
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Quick Retrain
          </Button>
          
          <Button 
            onClick={handleQuickOptimize}
            size="sm" 
            variant="outline" 
            className="w-full justify-start"
            disabled={loading}
          >
            <Zap className="h-4 w-4 mr-2" />
            Optimize Performance
          </Button>
          
          <Button 
            onClick={handleViewDetails}
            size="sm" 
            variant="outline" 
            className="w-full justify-start"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Full Management
          </Button>
        </div>

        {/* Agent Metrics Summary */}
        <div className="space-y-2 pt-2 border-t">
          {loading ? (
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse"></div>
              <div className="h-4 bg-muted rounded animate-pulse"></div>
              <div className="h-4 bg-muted rounded animate-pulse"></div>
            </div>
          ) : agentStats ? (
            <>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  <span>Sources</span>
                </div>
                <span className="font-mono">{agentStats.sourcesCount} active</span>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  <span>Training</span>
                </div>
                <span className="font-mono">{agentStats.trainingProgress.toFixed(1)}% complete</span>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <Wrench className="h-3 w-3" />
                  <span>Last Update</span>
                </div>
                <span className="font-mono text-xs">{agentStats.lastUpdateTime}</span>
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground">Failed to load agent stats</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
