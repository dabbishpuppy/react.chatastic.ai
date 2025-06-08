
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Cpu, 
  MemoryStick, 
  Clock, 
  Activity, 
  TrendingUp, 
  User,
  Globe
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SystemOverviewProps {
  metrics: any;
  overallHealth: number;
  selectedAgentId?: string | null;
}

interface AgentMetrics {
  sourcesActive: number;
  trainingStatus: number;
  querySuccess: number;
}

export const SystemOverview: React.FC<SystemOverviewProps> = ({ 
  metrics, 
  overallHealth,
  selectedAgentId 
}) => {
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedAgentId) {
      fetchAgentMetrics();
    }
  }, [selectedAgentId]);

  const fetchAgentMetrics = async () => {
    if (!selectedAgentId) return;
    
    try {
      setLoading(true);
      
      // Fetch agent sources count
      const { count: sourcesCount } = await supabase
        .from('agent_sources')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', selectedAgentId)
        .eq('is_active', true);

      // Fetch latest training job for progress
      const { data: trainingJob } = await supabase
        .from('agent_training_jobs')
        .select('*')
        .eq('agent_id', selectedAgentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let trainingProgress = 100;
      if (trainingJob && trainingJob.status === 'running') {
        trainingProgress = trainingJob.total_chunks > 0 
          ? (trainingJob.processed_chunks / trainingJob.total_chunks) * 100 
          : 0;
      }

      setAgentMetrics({
        sourcesActive: sourcesCount || 0,
        trainingStatus: trainingProgress,
        querySuccess: 99.2 // Mock data for now
      });
    } catch (error) {
      console.error('Error fetching agent metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (value: number) => {
    if (value >= 80) return 'text-green-600';
    if (value >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBadgeVariant = (value: number) => {
    if (value >= 80) return 'default';
    if (value >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Header with scope indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {selectedAgentId ? <User className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
            {selectedAgentId ? 'Agent System Overview' : 'Global System Overview'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-3xl font-bold ${getHealthColor(overallHealth)}`}>
                {overallHealth}%
              </div>
              <Badge variant={getHealthBadgeVariant(overallHealth)} className="mt-1">
                {selectedAgentId ? 'Agent Health' : 'System Health'}
              </Badge>
            </div>
            <div className="w-32">
              <Progress value={overallHealth} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.cpuUsage || 25}%</div>
            <Progress value={metrics?.cpuUsage || 25} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.memoryUsage || 35}%</div>
            <Progress value={metrics?.memoryUsage || 35} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.responseTime || 150}ms</div>
            <p className="text-xs text-muted-foreground">
              {selectedAgentId ? 'Agent avg' : 'Global avg'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.throughput || 1250}</div>
            <p className="text-xs text-muted-foreground">
              requests/min
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Agent-Specific Metrics */}
      {selectedAgentId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sources Active</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="animate-pulse">
                    <div className="h-8 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Training Status</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="animate-pulse">
                    <div className="h-8 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Query Success</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="animate-pulse">
                    <div className="h-8 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : agentMetrics ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sources Active</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{agentMetrics.sourcesActive}</div>
                  <p className="text-xs text-muted-foreground">
                    Active sources
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Training Status</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{agentMetrics.trainingStatus.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    Complete
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Query Success</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{agentMetrics.querySuccess}%</div>
                  <p className="text-xs text-muted-foreground">
                    Last 24h
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="col-span-3">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Failed to load agent metrics</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
