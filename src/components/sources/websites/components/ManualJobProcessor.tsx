
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface JobProcessorProps {
  parentSourceId: string;
}

const ManualJobProcessor: React.FC<JobProcessorProps> = ({ parentSourceId }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobStats, setJobStats] = useState({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  });

  const fetchJobStats = async () => {
    try {
      const { data: jobs, error } = await supabase
        .from('background_jobs')
        .select('status')
        .eq('source_id', parentSourceId);

      if (error) throw error;

      const stats = jobs?.reduce((acc, job) => {
        acc[job.status as keyof typeof acc] = (acc[job.status as keyof typeof acc] || 0) + 1;
        return acc;
      }, { pending: 0, processing: 0, completed: 0, failed: 0 }) || { pending: 0, processing: 0, completed: 0, failed: 0 };

      setJobStats(stats);
    } catch (error) {
      console.error('Error fetching job stats:', error);
    }
  };

  const triggerJobProcessing = async () => {
    setIsProcessing(true);
    try {
      console.log('🚀 Triggering manual job processing for source:', parentSourceId);

      // Call the workflow job processor edge function
      const { data, error } = await supabase.functions.invoke('workflow-job-processor', {
        body: { 
          action: 'process_jobs',
          sourceId: parentSourceId,
          maxJobs: 50
        }
      });

      if (error) {
        console.error('Job processing error:', error);
        toast({
          title: "Job Processing Error",
          description: `Failed to process jobs: ${error.message}`,
          variant: "destructive"
        });
      } else {
        console.log('✅ Job processing triggered:', data);
        toast({
          title: "Job Processing Started",
          description: `Processing ${jobStats.pending} pending jobs for this source`,
          variant: "default"
        });
        
        // Refresh stats after a delay
        setTimeout(fetchJobStats, 2000);
      }
    } catch (error) {
      console.error('Error triggering job processing:', error);
      toast({
        title: "Processing Failed",
        description: "Failed to trigger job processing",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const recoverStuckJobs = async () => {
    setIsProcessing(true);
    try {
      console.log('🔧 Recovering stuck jobs for source:', parentSourceId);

      // Reset stuck jobs back to pending
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

      const recoveredCount = data?.length || 0;
      
      toast({
        title: "Jobs Recovered",
        description: `Reset ${recoveredCount} stuck jobs back to pending`,
        variant: "default"
      });

      fetchJobStats();
    } catch (error) {
      console.error('Error recovering jobs:', error);
      toast({
        title: "Recovery Failed",
        description: "Failed to recover stuck jobs",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  React.useEffect(() => {
    fetchJobStats();
  }, [parentSourceId]);

  const hasStuckJobs = jobStats.pending > 0 || jobStats.processing > 0;

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlayCircle className="w-5 h-5" />
          Job Processing Control
          {hasStuckJobs && <AlertTriangle className="w-4 h-4 text-orange-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline">
            Pending: {jobStats.pending}
          </Badge>
          <Badge variant="outline">
            Processing: {jobStats.processing}
          </Badge>
          <Badge variant="outline">
            Completed: {jobStats.completed}
          </Badge>
          <Badge variant="outline">
            Failed: {jobStats.failed}
          </Badge>
        </div>

        {hasStuckJobs && (
          <div className="flex gap-2">
            <Button
              onClick={triggerJobProcessing}
              disabled={isProcessing}
              size="sm"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4 mr-2" />
              )}
              Process Jobs
            </Button>

            <Button
              onClick={recoverStuckJobs}
              disabled={isProcessing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Recover Stuck
            </Button>

            <Button
              onClick={fetchJobStats}
              disabled={isProcessing}
              variant="ghost"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ManualJobProcessor;
