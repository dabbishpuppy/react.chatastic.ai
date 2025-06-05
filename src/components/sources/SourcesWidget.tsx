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

/**
 * Phase 9: Updated to use Enhanced Sources Widget
 * This component now delegates to EnhancedSourcesWidget for improved functionality
 */
const SourcesWidget: React.FC<SourcesWidgetProps> = ({ currentTab }) => {
  // Import and use the enhanced version
  const EnhancedSourcesWidget = React.lazy(() => import('./EnhancedSourcesWidget'));
  
  return (
    <React.Suspense fallback={<SourcesLoadingState />}>
      <EnhancedSourcesWidget currentTab={currentTab} />
    </React.Suspense>
  );
};

export default SourcesWidget;
