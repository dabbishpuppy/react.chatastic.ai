
import React from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import WebsiteSourcesList from "../components/WebsiteSourcesList";
import { useWebsiteSourceOperations } from "../hooks/useWebsiteSourceOperations";

const WebsiteTabContainer: React.FC = () => {
  const { agentId } = useParams();
  const queryClient = useQueryClient();
  
  const handleRefetch = () => {
    console.log('Refetch triggered');
    // Invalidate both stats and paginated sources
    if (agentId) {
      queryClient.invalidateQueries({ queryKey: ['agent-source-stats', agentId] });
      queryClient.invalidateQueries({ queryKey: ['agent-sources-paginated', agentId, 'website'] });
    }
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

export default WebsiteTabContainer;
