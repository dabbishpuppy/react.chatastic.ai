
import React from "react";
import WebsiteSourcesContainer from "../WebsiteSourcesContainer";
import { useWorkflowSystem } from "@/hooks/useWorkflowSystem";
import { useWorkflowRealtime } from "@/hooks/useWorkflowRealtime";

const WebsiteTabContainer: React.FC = () => {
  const { isInitialized, isInitializing, error } = useWorkflowSystem();
  
  // Enable workflow real-time updates for website sources
  useWorkflowRealtime();

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Initializing workflow system...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">Error initializing workflow system: {error.message}</div>
      </div>
    );
  }

  return <WebsiteSourcesContainer />;
};

export default WebsiteTabContainer;
