
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Activity, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface QueueMetrics {
  processed: number;
  failed: number;
  avgProcessingTime: number;
  queueDepth: number;
}

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalJobs: number;
}

export const QueueMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchQueueMetrics = async () => {
    setIsLoading(true);
    try {
      // Fetch processor metrics
      const { data: processorData, error: processorError } = await supabase.functions.invoke('workflow-job-processor');
      
      if (processorError) {
        console.error('Error fetching processor metrics:', processorError);
      } else {
        setMetrics(processorData?.metrics || null);
      }

      // Fetch queue stats from database
      const { data: jobsData, error: jobsError } = await supabase
        .from('background_jobs')
        .select('status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (jobsError) {
        console.error('Error fetching job stats:', jobsError);
      } else if (jobsData) {
        const pending = jobsData.filter(job => job.status === 'pending').length;
        const processing = jobsData.filter(job => job.status === 'processing').length;
        const completed = jobsData.filter(job => job.status === 'completed').length;
        const failed = jobsData.filter(job => job.status === 'failed').length;

        setStats({
          pending,
          processing,
          completed,
          failed,
          totalJobs: jobsData.length
        });
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching queue data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerJobProcessing = async () => {
    try {
      const { error } = await supabase.functions.invoke('workflow-job-processor', {
        method: 'POST'
      });

      if (error) {
        console.error('Error triggering job processing:', error);
      } else {
        console.log('✅ Job processing triggered successfully');
        // Refresh metrics after triggering
        setTimeout(fetchQueueMetrics, 1000);
      }
    } catch (error) {
      console.error('Failed to trigger job processing:', error);
    }
  };

  useEffect(() => {
    fetchQueueMetrics();
    
    // Set up auto-refresh every 10 seconds
    const interval = setInterval(fetchQueueMetrics, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const getHealthStatus = () => {
    if (!stats) return 'unknown';
    
    const failureRate = stats.totalJobs > 0 ? (stats.failed / stats.totalJobs) * 100 : 0;
    const processingRate = stats.totalJobs > 0 ? (stats.processing / stats.totalJobs) * 100 : 0;
    
    if (failureRate > 20) return 'critical';
    if (failureRate > 10 || processingRate > 50) return 'warning';
    return 'healthy';
  };

  const getHealthIcon = () => {
    const status = getHealthStatus();
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getHealthColor = () => {
    const status = getHealthStatus();
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Queue Monitor</h2>
          {getHealthIcon()}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchQueueMetrics}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={triggerJobProcessing}
          >
            Process Jobs
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">Jobs waiting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.processing || 0}</div>
            <p className="text-xs text-muted-foreground">Jobs in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completed || 0}</div>
            <p className="text-xs text-muted-foreground">Jobs finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.failed || 0}</div>
            <p className="text-xs text-muted-foreground">Jobs failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Queue Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Status</span>
              <Badge variant="outline" className="flex items-center gap-1">
                {getHealthIcon()}
                {getHealthStatus().charAt(0).toUpperCase() + getHealthStatus().slice(1)}
              </Badge>
            </div>
            
            {stats && stats.totalJobs > 0 && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Success Rate</span>
                    <span>{((stats.completed / stats.totalJobs) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={(stats.completed / stats.totalJobs) * 100} 
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Failure Rate</span>
                    <span>{((stats.failed / stats.totalJobs) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={(stats.failed / stats.totalJobs) * 100} 
                    className="h-2"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Jobs Processed</span>
                  <span className="text-lg font-bold">{metrics.processed}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Processing Time</span>
                  <span className="text-lg font-bold">{metrics.avgProcessingTime.toFixed(0)}ms</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Queue Depth</span>
                  <span className="text-lg font-bold">{metrics.queueDepth}</span>
                </div>
              </>
            )}
            
            {lastUpdate && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Last Updated</span>
                <span>{lastUpdate.toLocaleTimeString()}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
