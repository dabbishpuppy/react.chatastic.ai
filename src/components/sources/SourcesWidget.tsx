
import React from "react";
import { useOptimizedAgentSources } from "@/hooks/useOptimizedAgentSources";
import { useAgentSourceStats } from "@/hooks/useAgentSourceStats";
import { useSourceSizeCalculations } from "@/hooks/useSourceSizeCalculations";
import SourcesLoadingState from "./SourcesLoadingState";
import SourcesErrorState from "./SourcesErrorState";
import SourcesContent from "./SourcesContent";

interface SourcesWidgetProps {
  currentTab?: string;
}

const SourcesWidget: React.FC<SourcesWidgetProps> = ({ currentTab }) => {
  const { sources: sourcesData, loading: sourcesLoading, error: sourcesError } = useOptimizedAgentSources();
  const { stats, loading: statsLoading, error: statsError } = useAgentSourceStats();

  console.log(`📊 SourcesWidget render: tab=${currentTab}, sources=${sourcesData.length}, stats=${JSON.stringify(stats)}`);

  // Use stats for total counts and sizes, but still use individual sources for display
  const { sourcesByType } = useSourceSizeCalculations(
    sourcesData, 
    undefined, // Don't pass currentTab to ensure all types are always shown
    0 // We don't need realtime size updates since we have stats
  );

  // Format total size from stats
  const formatTotalSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  // Show loading if either sources or stats are loading
  if (sourcesLoading || statsLoading) {
    return <SourcesLoadingState />;
  }

  // Show error if either sources or stats have errors
  if (sourcesError || statsError) {
    return <SourcesErrorState error={sourcesError || statsError || 'Unknown error'} />;
  }

  return (
    <SourcesContent
      totalSources={stats.totalSources}
      totalSize={formatTotalSize(stats.totalBytes)}
      sourcesByType={sourcesByType}
      currentTab={currentTab}
      sourcesLength={sourcesData.length}
    />
  );
};

export default SourcesWidget;
