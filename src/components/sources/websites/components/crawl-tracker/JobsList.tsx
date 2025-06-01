
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

interface CrawlJob {
  id: string;
  url: string;
  status: string;
  error_message?: string;
}

interface JobsListProps {
  jobs: CrawlJob[];
  loading: boolean;
  onLoadJobs: () => void;
}

const JobsList: React.FC<JobsListProps> = ({ jobs, loading, onLoadJobs }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Job Details</span>
        <Button variant="ghost" size="sm" onClick={onLoadJobs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      <div className="max-h-48 overflow-y-auto space-y-1">
        {jobs.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            <p className="text-sm">No job details available</p>
            <Button variant="ghost" size="sm" onClick={onLoadJobs} className="mt-2">
              Load Jobs
            </Button>
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {getStatusIcon(job.status)}
                <span className="truncate">{job.url}</span>
              </div>
              <Badge variant="outline" className={`ml-2 ${getStatusColor(job.status)}`}>
                {job.status}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default JobsList;
