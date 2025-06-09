
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  RefreshCw, 
  PlayCircle, 
  Clock, 
  CheckCircle, 
  XCircle,
  Activity,
  Database
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CrawlDiagnosticsProps {
  parentSourceId: string;
}

interface DiagnosticData {
  jobStats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  };
  pageStats: {
    pending: number;
    in_progress: number;
    completed: number;
    failed: number;
    total: number;
  };
  cronStatus: {
    lastRun: string | null;
    isActive: boolean;
    nextRun: string | null;
  };
  systemHealth: {
    queueDepth: number;
    avgProcessingTime: number;
    errorRate: number;
  };
}

const CrawlDiagnostics: React.FC<CrawlDiagnosticsProps> = ({ parentSourceId }) => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const { toast } = useToast();

  const fetchDiagnostics = async () => {
    setIsLoading(true);
    try {
      // Get background job stats
      const { data: jobStats, error: jobError } = await supabase
        .from('background_jobs')
        .select('status')
        .eq('source_id', parentSourceId);

      if (jobError) throw jobError;

      // Get source page stats
      const { data: pageStats, error: pageError } = await supabase
        .from('source_pages')
        .select('status')
        .eq('parent_source_id', parentSourceId);

      if (pageError) throw pageError;

      // Calculate job statistics
      const jobCounts = jobStats?.reduce((acc, job) => {
        acc[job.status as keyof typeof acc] = (acc[job.status as keyof typeof acc] || 0) + 1;
        acc.total++;
        return acc;
      }, { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 }) || 
      { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 };

      // Calculate page statistics
      const pageCounts = pageStats?.reduce((acc, page) => {
        acc[page.status as keyof typeof acc] = (acc[page.status as keyof typeof acc] || 0) + 1;
        acc.total++;
        return acc;
      }, { pending: 0, in_progress: 0, completed: 0, failed: 0, total: 0 }) || 
      { pending: 0, in_progress: 0, completed: 0, failed: 0, total: 0 };

      // Get recent workflow events for cron status estimation
      const { data: recentEvents } = await supabase
        .from('workflow_events')
        .select('created_at, event_type')
        .eq('source_id', parentSourceId)
        .order('created_at', { ascending: false })
        .limit(10);

      const lastProcessingEvent = recentEvents?.find(e => 
        e.event_type?.includes('PROCESSING') || e.event_type?.includes('COMPLETED')
      );

      setDiagnostics({
        jobStats: jobCounts,
        pageStats: pageCounts,
        cronStatus: {
          lastRun: lastProcessingEvent?.created_at || null,
          isActive: (Date.now() - new Date(lastProcessingEvent?.created_at || 0).getTime()) < 5 * 60 * 1000, // Active if ran in last 5 minutes
          nextRun: null // Will be calculated based on cron schedule
        },
        systemHealth: {
          queueDepth: jobCounts.pending + jobCounts.processing,
          avgProcessingTime: 0, // Will be calculated from completed jobs
          errorRate: jobCounts.total > 0 ? (jobCounts.failed / jobCounts.total) * 100 : 0
        }
      });

    } catch (error) {
      console.error('Error fetching diagnostics:', error);
      toast({
        title: "Diagnostic Error",
        description: "Failed to fetch crawling diagnostics",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const triggerCronJob = async () => {
    setIsRecovering(true);
    try {
      console.log('🚀 Manually triggering workflow job processor...');

      // Call the workflow job processor directly
      const { data, error } = await supabase.functions.invoke('workflow-job-processor', {
        body: { 
          action: 'process_jobs',
          sourceId: parentSourceId,
          maxJobs: 100,
          forceTrigger: true
        }
      });

      if (error) {
        console.error('Cron job trigger error:', error);
        toast({
          title: "Trigger Failed",
          description: `Failed to trigger job processor: ${error.message}`,
          variant: "destructive"
        });
      } else {
        console.log('✅ Job processor triggered:', data);
        toast({
          title: "Jobs Triggered",
          description: `Job processor started manually. Processing ${diagnostics?.jobStats.pending || 0} pending jobs.`,
          variant: "default"
        });
        
        // Refresh diagnostics after a delay
        setTimeout(fetchDiagnostics, 3000);
      }
    } catch (error) {
      console.error('Error triggering cron job:', error);
      toast({
        title: "Trigger Failed",
        description: "Failed to trigger the job processor",
        variant: "destructive"
      });
    } finally {
      setIsRecovering(false);
    }
  };

  const resetStuckJobs = async () => {
    setIsRecovering(true);
    try {
      console.log('🔧 Resetting stuck jobs...');

      // Reset jobs that have been processing for too long
      const { data, error } = await supabase
        .from('background_jobs')
        .update({
          status: 'pending',
          started_at: null,
          error_message: 'Reset from manual recovery',
          updated_at: new Date().toISOString()
        })
        .eq('source_id', parentSourceId)
        .eq('status', 'processing')
        .select();

      if (error) throw error;

      const resetCount = data?.length || 0;
      
      toast({
        title: "Jobs Reset",
        description: `Reset ${resetCount} stuck jobs back to pending`,
        variant: "default"
      });

      fetchDiagnostics();
    } catch (error) {
      console.error('Error resetting jobs:', error);
      toast({
        title: "Reset Failed",
        description: "Failed to reset stuck jobs",
        variant: "destructive"
      });
    } finally {
      setIsRecovering(false);
    }
  };

  const runFullRecovery = async () => {
    setIsRecovering(true);
    try {
      toast({
        title: "Starting Full Recovery",
        description: "Running comprehensive recovery process...",
        variant: "default"
      });

      // Step 1: Reset stuck jobs
      await resetStuckJobs();
      
      // Step 2: Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Trigger job processor
      await triggerCronJob();
      
      toast({
        title: "Recovery Complete",
        description: "Full recovery process completed. Monitor progress below.",
        variant: "default"
      });

    } catch (error) {
      console.error('Error during full recovery:', error);
      toast({
        title: "Recovery Failed",
        description: "Full recovery process failed",
        variant: "destructive"
      });
    } finally {
      setIsRecovering(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDiagnostics, 30000);
    return () => clearInterval(interval);
  }, [parentSourceId]);

  if (!diagnostics) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Crawl Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Loading diagnostics...
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasStuckJobs = diagnostics.jobStats.pending > 0;
  const isHealthy = diagnostics.cronStatus.isActive && !hasStuckJobs;

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Crawl Diagnostics
          {!isHealthy && <AlertTriangle className="w-4 h-4 text-orange-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{diagnostics.jobStats.total}</div>
            <div className="text-sm text-gray-500">Total Jobs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{diagnostics.jobStats.pending}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{diagnostics.jobStats.completed}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{diagnostics.jobStats.failed}</div>
            <div className="text-sm text-gray-500">Failed</div>
          </div>
        </div>

        {/* Job Status Badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending: {diagnostics.jobStats.pending}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Processing: {diagnostics.jobStats.processing}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Completed: {diagnostics.jobStats.completed}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Failed: {diagnostics.jobStats.failed}
          </Badge>
        </div>

        {/* Page Statistics */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Page Status Overview
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div>Pages Pending: {diagnostics.pageStats.pending}</div>
            <div>Pages In Progress: {diagnostics.pageStats.in_progress}</div>
            <div>Pages Completed: {diagnostics.pageStats.completed}</div>
            <div>Pages Failed: {diagnostics.pageStats.failed}</div>
          </div>
        </div>

        {/* Cron Job Status */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">System Health</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span>Job Processor Status:</span>
              <Badge variant={diagnostics.cronStatus.isActive ? "default" : "destructive"}>
                {diagnostics.cronStatus.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            {diagnostics.cronStatus.lastRun && (
              <div>Last Processing: {new Date(diagnostics.cronStatus.lastRun).toLocaleString()}</div>
            )}
            <div>Queue Depth: {diagnostics.systemHealth.queueDepth}</div>
            <div>Error Rate: {diagnostics.systemHealth.errorRate.toFixed(1)}%</div>
          </div>
        </div>

        {/* Recovery Actions */}
        {hasStuckJobs && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2 text-orange-600">Recovery Actions Needed</h4>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={triggerCronJob}
                disabled={isRecovering}
                size="sm"
                variant="default"
              >
                {isRecovering ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <PlayCircle className="w-4 h-4 mr-2" />
                )}
                Trigger Job Processor
              </Button>

              <Button
                onClick={resetStuckJobs}
                disabled={isRecovering}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Stuck Jobs
              </Button>

              <Button
                onClick={runFullRecovery}
                disabled={isRecovering}
                variant="destructive"
                size="sm"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Full Recovery
              </Button>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="border-t pt-4">
          <Button
            onClick={fetchDiagnostics}
            disabled={isLoading}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh Diagnostics
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CrawlDiagnostics;
