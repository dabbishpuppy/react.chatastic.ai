
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WorkflowEngine } from '@/services/workflow/WorkflowEngine';
import { BackgroundJob } from '@/services/workflow/types';
import { Loader2, Clock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface WorkflowJobsPanelProps {
  sourceId: string;
}

const WorkflowJobsPanel: React.FC<WorkflowJobsPanelProps> = ({ sourceId }) => {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const backgroundJobs = await WorkflowEngine.getBackgroundJobs(sourceId);
      setJobs(backgroundJobs);
    } catch (error) {
      console.error('Error fetching background jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [sourceId]);

  const getJobIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getJobBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'processing': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: number) => {
    if (priority <= 50) {
      return <Badge variant="destructive">High</Badge>;
    }
    if (priority <= 100) {
      return <Badge variant="default">Normal</Badge>;
    }
    return <Badge variant="secondary">Low</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Background Jobs</CardTitle>
        <Button
          onClick={fetchJobs}
          disabled={loading}
          size="sm"
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading jobs...</span>
              </div>
            ) : jobs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No background jobs found</p>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="flex items-start gap-3 pb-4 border-b last:border-b-0">
                  <div className="flex-shrink-0 mt-1">
                    {getJobIcon(job.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm">
                        {job.job_type.replace('_', ' ')}
                      </span>
                      {getJobBadge(job.status)}
                      {getPriorityBadge(job.priority)}
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Attempts: {job.attempts}/{job.max_attempts}</p>
                      <p>Scheduled: {new Date(job.scheduled_at).toLocaleString()}</p>
                      {job.started_at && (
                        <p>Started: {new Date(job.started_at).toLocaleString()}</p>
                      )}
                      {job.completed_at && (
                        <p>Completed: {new Date(job.completed_at).toLocaleString()}</p>
                      )}
                    </div>
                    
                    {job.error_message && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        {job.error_message}
                      </div>
                    )}
                    
                    {job.payload && Object.keys(job.payload).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer">
                          Show payload
                        </summary>
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mt-1">
                          <pre>{JSON.stringify(job.payload, null, 2)}</pre>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default WorkflowJobsPanel;
