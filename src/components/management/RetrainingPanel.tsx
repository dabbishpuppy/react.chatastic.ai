
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Pause } from 'lucide-react';

interface RetrainingStatus {
  shouldRetrain: boolean;
  reasons: string[];
  urgency: 'low' | 'medium' | 'high';
}

interface RetrainingJob {
  jobId: string;
  status: string;
  progress: {
    sourcesProcessed: number;
    totalSources: number;
    chunksProcessed: number;
    totalChunks: number;
    embeddingsGenerated: number;
    estimatedTimeRemaining?: number;
  };
}

interface RetrainingPanelProps {
  retrainingNeeded: RetrainingStatus | null;
  activeJobs: RetrainingJob[];
  isStartingRetraining: boolean;
  onStartRetraining: () => void;
  onCancelRetraining: (jobId: string) => void;
}

export const RetrainingPanel: React.FC<RetrainingPanelProps> = ({
  retrainingNeeded,
  activeJobs,
  isStartingRetraining,
  onStartRetraining,
  onCancelRetraining
}) => {
  return (
    <div className="space-y-6">
      {/* Retraining Status */}
      {retrainingNeeded && (
        <Card>
          <CardHeader>
            <CardTitle>Retraining Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Retraining Needed:</span>
                <Badge variant={retrainingNeeded.shouldRetrain ? "destructive" : "secondary"}>
                  {retrainingNeeded.shouldRetrain ? "Yes" : "No"}
                </Badge>
              </div>
              
              {retrainingNeeded.shouldRetrain && (
                <>
                  <div className="flex items-center justify-between">
                    <span>Urgency:</span>
                    <Badge variant={retrainingNeeded.urgency === 'high' ? "destructive" : 
                                  retrainingNeeded.urgency === 'medium' ? "default" : "secondary"}>
                      {retrainingNeeded.urgency}
                    </Badge>
                  </div>
                  
                  <div>
                    <span className="font-medium">Reasons:</span>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {retrainingNeeded.reasons.map((reason, index) => (
                        <li key={index} className="text-sm text-gray-600">{reason}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <Button 
                    onClick={onStartRetraining}
                    disabled={isStartingRetraining}
                    className="w-full"
                  >
                    {isStartingRetraining ? 'Starting...' : 'Start Retraining'}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Retraining Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeJobs.map((job) => (
                <div key={job.jobId} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Job {job.jobId.slice(-8)}</span>
                    <div className="flex space-x-2">
                      <Badge variant="outline">{job.status}</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCancelRetraining(job.jobId)}
                      >
                        <Pause className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Sources: {job.progress.sourcesProcessed}/{job.progress.totalSources}</span>
                        <span>{Math.round((job.progress.sourcesProcessed / job.progress.totalSources) * 100)}%</span>
                      </div>
                      <Progress 
                        value={(job.progress.sourcesProcessed / job.progress.totalSources) * 100} 
                        className="h-2"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Chunks: {job.progress.chunksProcessed}/{job.progress.totalChunks}</span>
                        <span>{Math.round((job.progress.chunksProcessed / job.progress.totalChunks) * 100)}%</span>
                      </div>
                      <Progress 
                        value={(job.progress.chunksProcessed / job.progress.totalChunks) * 100} 
                        className="h-2"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Embeddings:</span>
                        <span className="ml-2 font-medium">{job.progress.embeddingsGenerated}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">ETA:</span>
                        <span className="ml-2 font-medium">
                          {job.progress.estimatedTimeRemaining 
                            ? `${Math.round(job.progress.estimatedTimeRemaining / 60000)}m`
                            : 'Calculating...'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
