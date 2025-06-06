
import React from "react";
import WebsiteSourcesList from "./components/WebsiteSourcesList";
import { useWebsiteSourceOperations } from "./hooks/useWebsiteSourceOperations";

const WebsiteSourcesContainer: React.FC = () => {
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

  return (
    <div className="space-y-6 mt-4">
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

export default WebsiteSourcesContainer;
