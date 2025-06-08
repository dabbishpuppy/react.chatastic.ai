
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Activity, 
  TrendingUp, 
  Users, 
  Zap,
  RefreshCw,
  AlertCircle,
  Database,
  Clock,
  BarChart3
} from 'lucide-react';
import { ProductionCrawlOrchestrator } from '@/services/rag/enhanced/productionCrawlOrchestrator';
import { ProductionQueueManager } from '@/services/workflow/ProductionQueueManager';
import { ResilientCrawlService } from '@/services/rag/enhanced/resilientCrawlService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface JobMetrics {
  totalJobs: number;
  pendingJobs: number;
  inProgressJobs: number;
  completedJobs: number;
  failedJobs: number;
  conflictRate: number;
  processingRate: number;
  lastUpdate: string;
}

interface SystemHealth {
  crawlService: any;
  healthMonitor: any;
  overallHealth: 'healthy' | 'degraded' | 'critical';
}

export const MonitoringDashboard: React.FC = () => {
  const [jobMetrics, setJobMetrics] = useState<JobMetrics>({
    totalJobs: 0,
    pendingJobs: 0,
    inProgressJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    conflictRate: 0,
    processingRate: 0,
    lastUpdate: new Date().toISOString()
  });
  
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    crawlService: { available: true, failureCount: 0 },
    healthMonitor: { available: true, failureCount: 0 },
    overallHealth: 'healthy'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [orchestratorRunning, setOrchestratorRunning] = useState(false);
  const [queueManagerRunning, setQueueManagerRunning] = useState(false);
  const { toast } = useToast();

  // Load metrics on component mount and set up polling
  useEffect(() => {
    loadSystemMetrics();
    loadSystemHealth();
    
    const interval = setInterval(() => {
      loadSystemMetrics();
      loadSystemHealth();
    }, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadSystemMetrics = async () => {
    try {
      // Get job metrics from the database
      const { data: jobs, error } = await supabase
        .from('source_pages')
        .select('status, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const recentJobs = jobs?.filter(job => 
        new Date(job.created_at) > oneHourAgo
      ) || [];

      const totalJobs = jobs?.length || 0;
      const pendingJobs = jobs?.filter(j => j.status === 'pending').length || 0;
      const inProgressJobs = jobs?.filter(j => j.status === 'in_progress').length || 0;
      const completedJobs = jobs?.filter(j => j.status === 'completed').length || 0;
      const failedJobs = jobs?.filter(j => j.status === 'failed').length || 0;
      
      // Calculate conflict rate (jobs that failed vs total processed)
      const processedJobs = completedJobs + failedJobs;
      const conflictRate = processedJobs > 0 ? (failedJobs / processedJobs) * 100 : 0;
      
      // Calculate processing rate (jobs completed in last hour)
      const recentCompleted = recentJobs.filter(j => j.status === 'completed').length;
      const processingRate = recentCompleted;

      setJobMetrics({
        totalJobs,
        pendingJobs,
        inProgressJobs,
        completedJobs,
        failedJobs,
        conflictRate,
        processingRate,
        lastUpdate: new Date().toISOString()
      });

    } catch (error) {
      console.error('Failed to load system metrics:', error);
      toast({
        title: "Error Loading Metrics",
        description: "Failed to load system metrics. Please try again.",
        variant: "destructive"
      });
    }
  };

  const loadSystemHealth = () => {
    const health = ResilientCrawlService.getSystemStatus();
    setSystemHealth(health);
  };

  const handleStartOrchestrator = async () => {
    setIsLoading(true);
    try {
      const orchestrator = ProductionCrawlOrchestrator.getInstance();
      await orchestrator.startOrchestrator();
      setOrchestratorRunning(true);
      
      toast({
        title: "Orchestrator Started",
        description: "Production crawl orchestrator is now running.",
      });
    } catch (error) {
      console.error('Failed to start orchestrator:', error);
      toast({
        title: "Start Failed",
        description: "Failed to start orchestrator. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartQueueManager = async () => {
    setIsLoading(true);
    try {
      const queueManager = ProductionQueueManager.getInstance();
      await queueManager.startProductionQueue();
      setQueueManagerRunning(true);
      
      toast({
        title: "Queue Manager Started",
        description: "Production queue manager is now running.",
      });
    } catch (error) {
      console.error('Failed to start queue manager:', error);
      toast({
        title: "Start Failed",
        description: "Failed to start queue manager. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergencyReset = async () => {
    if (!confirm('Are you sure you want to reset all failed jobs? This will retry all failed jobs.')) {
      return;
    }

    setIsLoading(true);
    try {
      const orchestrator = ProductionCrawlOrchestrator.getInstance();
      await orchestrator.emergencyReset();
      
      // Also trigger queue processing
      const queueManager = ProductionQueueManager.getInstance();
      await queueManager.startProductionQueue();
      
      await loadSystemMetrics();
      
      toast({
        title: "Emergency Reset Complete",
        description: "All failed jobs have been reset and processing restarted.",
      });
    } catch (error) {
      console.error('Emergency reset failed:', error);
      toast({
        title: "Reset Failed",
        description: "Emergency reset failed. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceRecovery = async () => {
    setIsLoading(true);
    try {
      const orchestrator = ProductionCrawlOrchestrator.getInstance();
      await orchestrator.forceRecovery();
      
      await loadSystemMetrics();
      
      toast({
        title: "Recovery Complete",
        description: "Forced recovery has been executed.",
      });
    } catch (error) {
      console.error('Force recovery failed:', error);
      toast({
        title: "Recovery Failed",
        description: "Force recovery failed. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryFailedJobs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-crawl-website', {
        body: { 
          mode: 'retry_failed',
          batchSize: 50
        }
      });

      if (error) throw error;

      await loadSystemMetrics();
      
      toast({
        title: "Retry Initiated",
        description: `Retrying failed jobs. Check progress in the metrics.`,
      });
    } catch (error) {
      console.error('Retry failed jobs error:', error);
      toast({
        title: "Retry Failed",
        description: "Failed to retry jobs. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthBadgeColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getConflictRateColor = (rate: number) => {
    if (rate > 80) return 'text-red-600';
    if (rate > 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor crawling performance, system health, and resolve issues
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={loadSystemMetrics} 
            variant="outline" 
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {jobMetrics.failedJobs > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{jobMetrics.failedJobs} failed jobs detected</strong> with {jobMetrics.conflictRate.toFixed(1)}% conflict rate. 
            Immediate action recommended.
          </AlertDescription>
        </Alert>
      )}

      {systemHealth.overallHealth === 'critical' && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>System health critical</strong> - Multiple services are experiencing issues.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="production-crawl">Production Crawl</TabsTrigger>
          <TabsTrigger value="production-queue">Production Queue</TabsTrigger>
          <TabsTrigger value="health-check">Health Check</TabsTrigger>
          <TabsTrigger value="recovery">Recovery Actions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <div className={`h-3 w-3 rounded-full ${getHealthBadgeColor(systemHealth.overallHealth)}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{systemHealth.overallHealth}</div>
                <p className="text-xs text-muted-foreground">Overall system status</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Jobs</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{jobMetrics.failedJobs}</div>
                <p className="text-xs text-muted-foreground">
                  {jobMetrics.conflictRate.toFixed(1)}% conflict rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Processing Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{jobMetrics.processingRate}</div>
                <p className="text-xs text-muted-foreground">Jobs/hour completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
                <Activity className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{jobMetrics.pendingJobs}</div>
                <p className="text-xs text-muted-foreground">Pending jobs</p>
              </CardContent>
            </Card>
          </div>

          {/* Job Status Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Job Processing Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{jobMetrics.completedJobs}</div>
                    <div className="text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{jobMetrics.inProgressJobs}</div>
                    <div className="text-muted-foreground">In Progress</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{jobMetrics.pendingJobs}</div>
                    <div className="text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{jobMetrics.failedJobs}</div>
                    <div className="text-muted-foreground">Failed</div>
                  </div>
                </div>
                
                {jobMetrics.totalJobs > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{Math.round(((jobMetrics.completedJobs + jobMetrics.failedJobs) / jobMetrics.totalJobs) * 100)}%</span>
                    </div>
                    <Progress 
                      value={((jobMetrics.completedJobs + jobMetrics.failedJobs) / jobMetrics.totalJobs) * 100} 
                      className="h-2"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Production Crawl Tab */}
        <TabsContent value="production-crawl" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Orchestrator Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <Badge variant={orchestratorRunning ? "default" : "secondary"}>
                    {orchestratorRunning ? "Running" : "Stopped"}
                  </Badge>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleStartOrchestrator}
                    disabled={isLoading}
                    size="sm"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Start Orchestrator
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  The orchestrator manages 2000+ concurrent crawls with health monitoring and recovery.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Conflict Rate</div>
                    <div className={`text-lg font-bold ${getConflictRateColor(jobMetrics.conflictRate)}`}>
                      {jobMetrics.conflictRate.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Processing Rate</div>
                    <div className="text-lg font-bold">{jobMetrics.processingRate}/hour</div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Last updated: {new Date(jobMetrics.lastUpdate).toLocaleTimeString()}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Production Queue Tab */}
        <TabsContent value="production-queue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Queue Manager Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Queue Status:</span>
                <Badge variant={queueManagerRunning ? "default" : "secondary"}>
                  {queueManagerRunning ? "Active" : "Inactive"}
                </Badge>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleStartQueueManager}
                  disabled={isLoading}
                  size="sm"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Start Queue Manager
                </Button>
              </div>
              
              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="text-center">
                  <div className="text-xl font-bold">{jobMetrics.pendingJobs}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{jobMetrics.inProgressJobs}</div>
                  <div className="text-sm text-muted-foreground">Processing</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{jobMetrics.completedJobs}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Check Tab */}
        <TabsContent value="health-check" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Crawl Service</span>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${systemHealth.crawlService.available ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm">{systemHealth.crawlService.available ? 'Available' : 'Unavailable'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Health Monitor</span>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${systemHealth.healthMonitor.available ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm">{systemHealth.healthMonitor.available ? 'Available' : 'Unavailable'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Errors:</span>
                    <span className="font-bold text-red-600">{jobMetrics.failedJobs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Error Rate:</span>
                    <span className={`font-bold ${getConflictRateColor(jobMetrics.conflictRate)}`}>
                      {jobMetrics.conflictRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground pt-2">
                    High conflict rates indicate worker coordination issues or resource contention.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recovery Actions Tab */}
        <TabsContent value="recovery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recovery Actions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Use these tools to recover from system issues and restart failed processes.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={handleRetryFailedJobs}
                  disabled={isLoading || jobMetrics.failedJobs === 0}
                  variant="outline"
                  className="justify-start"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Failed Jobs ({jobMetrics.failedJobs})
                </Button>

                <Button 
                  onClick={handleForceRecovery}
                  disabled={isLoading}
                  variant="outline"
                  className="justify-start"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Force Recovery
                </Button>

                <Button 
                  onClick={handleEmergencyReset}
                  disabled={isLoading}
                  variant="destructive"
                  className="justify-start"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Emergency Reset
                </Button>

                <Button 
                  onClick={() => {
                    loadSystemMetrics();
                    loadSystemHealth();
                  }}
                  disabled={isLoading}
                  variant="secondary"
                  className="justify-start"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Refresh All Data
                </Button>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Emergency Reset</strong> will reset all failed jobs to pending status and restart processing. 
                  Use this as a last resort when the system is stuck.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
