
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOptimizedAgentSources } from '@/hooks/useOptimizedAgentSources';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryClient } from '@tanstack/react-query';

const SimplifiedSourcesWidget: React.FC = () => {
  const { agentId } = useParams();
  const queryClient = useQueryClient();
  
  const { sources, loading } = useOptimizedAgentSources();

  // Listen for real-time updates to invalidate queries
  useEffect(() => {
    const handleSourceUpdate = () => {
      if (agentId) {
        queryClient.invalidateQueries({ queryKey: ['agent-source-stats', agentId] });
      }
    };

    const handleTrainingStateReset = () => {
      if (agentId) {
        queryClient.invalidateQueries({ queryKey: ['agent-source-stats', agentId] });
      }
    };

    const handleCrawlCompleted = () => {
      if (agentId) {
        queryClient.invalidateQueries({ queryKey: ['agent-source-stats', agentId] });
      }
    };

    window.addEventListener('sourceUpdated', handleSourceUpdate);
    window.addEventListener('trainingStateReset', handleTrainingStateReset);
    window.addEventListener('crawlCompletedReadyForTraining', handleCrawlCompleted);
    
    return () => {
      window.removeEventListener('sourceUpdated', handleSourceUpdate);
      window.removeEventListener('trainingStateReset', handleTrainingStateReset);
      window.removeEventListener('crawlCompletedReadyForTraining', handleCrawlCompleted);
    };
  }, [agentId, queryClient]);

  // Calculate stats from sources
  const stats = React.useMemo(() => {
    if (!sources || sources.length === 0) return null;
    
    const sourcesByType = sources.reduce((acc, source) => {
      const type = source.source_type;
      if (!acc[type]) {
        acc[type] = 0;
      }
      // For website sources, only count parent sources
      if (type === 'website' && source.parent_source_id) {
        return acc;
      }
      acc[type]++;
      return acc;
    }, {} as Record<string, number>);

    return {
      text: sourcesByType.text || 0,
      qa: sourcesByType.qa || 0,
      file: sourcesByType.file || 0,
      website: sourcesByType.website || 0,
    };
  }, [sources]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sources Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sources Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No source data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sources Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Text Sources</span>
          <span className="font-medium">{stats.text}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Q&A Sources</span>
          <span className="font-medium">{stats.qa}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">File Sources</span>
          <span className="font-medium">{stats.file}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Website Sources</span>
          <span className="font-medium">{stats.website}</span>
        </div>
        <div className="border-t pt-3 mt-3">
          <div className="flex justify-between font-semibold">
            <span>Total Sources</span>
            <span>{stats.text + stats.qa + stats.file + stats.website}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimplifiedSourcesWidget;
