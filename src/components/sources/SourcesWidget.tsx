
import React, { useEffect, useState } from "react";
import { useAgentSourceStats } from "@/hooks/useAgentSourceStats";
import { useAgentSourcesRealtime } from "@/hooks/useAgentSourcesRealtime";
import { useAgentRetraining } from "@/hooks/useAgentRetraining";
import { useParams } from "react-router-dom";
import SourcesLoadingState from "./SourcesLoadingState";
import SourcesErrorState from "./SourcesErrorState";
import SourcesContent from "./SourcesContent";
import { RetrainingDialog } from "./RetrainingDialog";

interface SourcesWidgetProps {
  currentTab?: string;
}

const SourcesWidget: React.FC<SourcesWidgetProps> = ({ currentTab }) => {
  const { agentId } = useParams();
  const { stats, loading, error } = useAgentSourceStats();
  const [showRetrainingDialog, setShowRetrainingDialog] = useState(false);
  
  const {
    isRetraining,
    progress,
    retrainingNeeded,
    startRetraining,
    checkRetrainingNeeded
  } = useAgentRetraining(agentId);
  
  // Set up centralized real-time subscription
  useAgentSourcesRealtime();

  // Check retraining status on mount and when stats change
  useEffect(() => {
    if (agentId) {
      checkRetrainingNeeded();
    }
  }, [agentId, checkRetrainingNeeded, stats.totalSources, stats.requiresTraining]);

  console.log(`📊 SourcesWidget render with enhanced stats:`, {
    totalSources: stats.totalSources,
    requiresTraining: stats.requiresTraining,
    unprocessedCrawledPages: stats.unprocessedCrawledPages,
    retrainingNeeded: retrainingNeeded?.needed
  });

  // Format total size from stats
  const formatTotalSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  const handleRetrainClick = () => {
    setShowRetrainingDialog(true);
  };

  if (loading) {
    return <SourcesLoadingState />;
  }

  if (error) {
    return <SourcesErrorState error={error} />;
  }

  return (
    <>
      <SourcesContent
        totalSources={stats.totalSources}
        totalSize={formatTotalSize(stats.totalBytes)}
        sourcesByType={stats.sourcesByType}
        currentTab={currentTab}
        onRetrainClick={handleRetrainClick}
        retrainingNeeded={retrainingNeeded?.needed || false}
        isRetraining={isRetraining}
        requiresTraining={stats.requiresTraining}
        unprocessedCrawledPages={stats.unprocessedCrawledPages}
      />

      <RetrainingDialog
        open={showRetrainingDialog}
        onOpenChange={setShowRetrainingDialog}
        isRetraining={isRetraining}
        progress={progress}
        retrainingNeeded={retrainingNeeded}
        onStartRetraining={startRetraining}
      />
    </>
  );
};

export default SourcesWidget;
