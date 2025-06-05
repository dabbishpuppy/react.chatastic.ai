
import React, { useEffect, useState } from "react";
import { useAgentSourceStats } from "@/hooks/useAgentSourceStats";
import { useAgentSourcesRealtime } from "@/hooks/useAgentSourcesRealtime";
import { useSimpleAgentTraining } from "@/hooks/useSimpleAgentTraining";
import { useParams } from "react-router-dom";
import SourcesLoadingState from "./SourcesLoadingState";
import SourcesErrorState from "./SourcesErrorState";
import SourcesContent from "./SourcesContent";

interface EnhancedSourcesWidgetProps {
  currentTab?: string;
}

const EnhancedSourcesWidget: React.FC<EnhancedSourcesWidgetProps> = ({ currentTab }) => {
  const { agentId } = useParams();
  const { data: stats, isLoading, error, refetch: refetchStats } = useAgentSourceStats();
  const { trainingProgress, isTraining, startTraining } = useSimpleAgentTraining();
  
  // Set up centralized real-time subscription
  useAgentSourcesRealtime();

  // Check if retraining is needed based on stats
  const [retrainingNeeded, setRetrainingNeeded] = useState(false);

  useEffect(() => {
    if (stats) {
      // Check if there are unprocessed sources or crawled pages
      const needsTraining = stats.requiresTraining || stats.unprocessedCrawledPages > 0;
      setRetrainingNeeded(needsTraining);
    }
  }, [stats]);

  // Listen for source events to refresh stats
  useEffect(() => {
    const handleSourceEvent = () => {
      console.log('Source event detected - refreshing stats');
      refetchStats();
    };

    const eventTypes = ['fileUploaded', 'sourceDeleted', 'sourceCreated', 'sourceUpdated', 'crawlCompleted', 'sourceStatusChanged', 'crawlStarted'];
    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, handleSourceEvent);
    });
    
    return () => {
      eventTypes.forEach(eventType => {
        window.removeEventListener(eventType, handleSourceEvent);
      });
    };
  }, [refetchStats]);

  // Format total size from stats
  const formatTotalSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  const handleRetrainClick = () => {
    console.log('Simple retrain button clicked');
    startTraining();
  };

  if (isLoading) {
    return <SourcesLoadingState />;
  }

  if (error) {
    return <SourcesErrorState error={error.message} />;
  }

  if (!stats) {
    return <SourcesErrorState error="No stats available" />;
  }

  return (
    <SourcesContent
      totalSources={stats.totalSources}
      totalSize={formatTotalSize(stats.totalBytes)}
      sourcesByType={stats.sourcesByType}
      currentTab={currentTab}
      onRetrainClick={handleRetrainClick}
      retrainingNeeded={retrainingNeeded}
      isRetraining={isTraining}
      isTrainingCompleted={trainingProgress?.status === 'completed'}
      trainingProgress={trainingProgress}
    />
  );
};

export default EnhancedSourcesWidget;
