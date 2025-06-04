
import React from "react";
import TabContainer from "./containers/TabContainer";
import { useAgentSourcesRealtime } from "@/hooks/useAgentSourcesRealtime";

const SourcesMainContent: React.FC = () => {
  // Set up real-time subscription at the main content level
  // This ensures consistent hook order regardless of which tab is active
  useAgentSourcesRealtime();

  return <TabContainer />;
};

export default SourcesMainContent;
