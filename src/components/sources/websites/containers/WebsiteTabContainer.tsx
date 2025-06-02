
import React from "react";
import { useWebsiteSourceOperations } from "../hooks/useWebsiteSourceOperations";
import WebsiteSourcesList from "../components/WebsiteSourcesList";
import EnhancedWebsiteCrawlFormV3 from "../components/EnhancedWebsiteCrawlFormV3";

const WebsiteTabContainer: React.FC = () => {
  // Create empty functions for refetch and removeSourceFromState
  const handleRefetch = () => {
    console.log('Refetch triggered');
    // This will be handled by the WebsiteSourcesList component internally
  };
  
  const handleRemoveFromState = (sourceId: string) => {
    console.log('Remove from state:', sourceId);
    // This will be handled by the WebsiteSourcesList component internally
  };

  const {
    handleEdit,
    handleExclude,
    handleDelete,
    handleRecrawl
  } = useWebsiteSourceOperations(handleRefetch, handleRemoveFromState);

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Website Training</h2>
      </div>

      <EnhancedWebsiteCrawlFormV3 />
      
      <WebsiteSourcesList
        onEdit={handleEdit}
        onExclude={handleExclude}
        onDelete={handleDelete}
        onRecrawl={handleRecrawl}
        loading={false}
        error={null}
      />
    </div>
  );
};

export default WebsiteTabContainer;
