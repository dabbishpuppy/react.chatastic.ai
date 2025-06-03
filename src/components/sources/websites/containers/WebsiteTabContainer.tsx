
import React from "react";
import { useParams } from "react-router-dom";
import WebsiteSourcesList from "../components/WebsiteSourcesList";
import WebsiteCrawlForm from "../components/WebsiteCrawlForm";
import CrawlRecoveryPanel from "../components/CrawlRecoveryPanel";
import { useWebsiteSourceOperations } from "../hooks/useWebsiteSourceOperations";

const WebsiteTabContainer: React.FC = () => {
  const { agentId } = useParams();
  
  const handleRefetch = () => {
    console.log('Refetch triggered');
  };
  
  const handleRemoveFromState = (sourceId: string) => {
    console.log('Remove from state:', sourceId);
  };

  const {
    handleEdit,
    handleExclude,
    handleDelete,
    handleRecrawl
  } = useWebsiteSourceOperations(handleRefetch, handleRemoveFromState);

  const handleRecoveryComplete = () => {
    // Trigger a refetch of the sources list
    handleRefetch();
  };

  return (
    <div className="space-y-6 mt-4">
      <WebsiteCrawlForm />
      
      {agentId && (
        <CrawlRecoveryPanel 
          agentId={agentId} 
          onRecoveryComplete={handleRecoveryComplete}
        />
      )}
      
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
