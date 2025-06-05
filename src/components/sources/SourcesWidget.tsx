
import React from "react";
import { useAgentSourceStats } from "@/hooks/useAgentSourceStats";
import { useAgentSourcesRealtime } from "@/hooks/useAgentSourcesRealtime";
import { useSimpleAgentTraining } from "@/hooks/useSimpleAgentTraining";
import { useParams } from "react-router-dom";
import SourcesLoadingState from "./SourcesLoadingState";
import SourcesErrorState from "./SourcesErrorState";
import SourcesContent from "./SourcesContent";

interface SourcesWidgetProps {
  currentTab?: string;
}

const SourcesWidget: React.FC<SourcesWidgetProps> = ({ currentTab }) => {
  const { agentId } = useParams();
  const { data: stats, isLoading, error, refetch: refetchStats } = useAgentSourceStats();
  const { trainingProgress, isTraining, startTraining } = useSimpleAgentTraining();
  
  // Set up centralized real-time subscription
  useAgentSourcesRealtime();

  // Check if retraining is needed based on stats
  const retrainingNeeded = stats ? (stats.requiresTraining || stats.unprocessedCrawledPages > 0) : false;

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

export default SourcesWidget;
