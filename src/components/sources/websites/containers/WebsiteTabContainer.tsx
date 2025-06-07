
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
    const errorMessage = typeof error === 'string' ? error : (error as any)?.message || 'Unknown error';
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">
          Error initializing workflow system: {errorMessage}
        </div>
      </div>
    );
  }

  return <WebsiteSourcesContainer />;
};

export default WebsiteTabContainer;
