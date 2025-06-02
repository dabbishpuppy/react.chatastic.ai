
import React from "react";
import { useAgentSourceStats } from "@/hooks/useAgentSourceStats";
import { useAgentSourcesRealtime } from "@/hooks/useAgentSourcesRealtime";
import SourcesLoadingState from "./SourcesLoadingState";
import SourcesErrorState from "./SourcesErrorState";
import SourcesContent from "./SourcesContent";

interface SourcesWidgetProps {
  currentTab?: string;
}

const SourcesWidget: React.FC<SourcesWidgetProps> = ({ currentTab }) => {
  const { stats, loading, error } = useAgentSourceStats();
  
  // Set up centralized real-time subscription
  useAgentSourcesRealtime();

  console.log(`📊 SourcesWidget render with enhanced website stats: tab=${currentTab}`, {
    websiteLinksCount: stats.sourcesByType.website.count,
    websiteCompressedSize: stats.sourcesByType.website.size,
    totalBytes: stats.totalBytes,
    allStats: stats
  });

  // Format total size from stats
  const formatTotalSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  if (loading) {
    return <SourcesLoadingState />;
  }

  if (error) {
    return <SourcesErrorState error={error} />;
  }

  return (
    <SourcesContent
      totalSources={stats.totalSources}
      totalSize={formatTotalSize(stats.totalBytes)}
      sourcesByType={stats.sourcesByType}
      currentTab={currentTab}
    />
  );
};

export default SourcesWidget;
