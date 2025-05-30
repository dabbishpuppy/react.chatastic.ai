
import React from "react";
import { useOptimizedAgentSources } from "@/hooks/useOptimizedAgentSources";
import { useSourceSizeCalculations } from "@/hooks/useSourceSizeCalculations";
import { useSourcesRealtimeSubscription } from "@/hooks/useSourcesRealtimeSubscription";
import SourcesLoadingState from "./SourcesLoadingState";
import SourcesErrorState from "./SourcesErrorState";
import SourcesContent from "./SourcesContent";

interface SourcesWidgetProps {
  currentTab?: string;
}

const SourcesWidget: React.FC<SourcesWidgetProps> = ({ currentTab }) => {
  const { sources: sourcesData, loading, error } = useOptimizedAgentSources();
  const realtimeSize = useSourcesRealtimeSubscription();

  console.log(`📊 SourcesWidget render: tab=${currentTab}, sources=${sourcesData.length}, loading=${loading}, error=${error}`);

  // Calculate total stats - show all source types regardless of current tab
  const { totalSources, totalSize, sourcesByType } = useSourceSizeCalculations(
    sourcesData, 
    undefined, // Don't pass currentTab to ensure all types are always shown
    realtimeSize
  );

  if (loading) {
    return <SourcesLoadingState />;
  }

  if (error) {
    return <SourcesErrorState error={error} />;
  }

  return (
    <SourcesContent
      totalSources={totalSources}
      totalSize={totalSize}
      sourcesByType={sourcesByType}
      currentTab={currentTab}
      sourcesLength={sourcesData.length}
    />
  );
};

export default SourcesWidget;
