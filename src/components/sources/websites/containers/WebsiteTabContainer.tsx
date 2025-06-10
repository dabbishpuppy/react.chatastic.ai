
import React from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import WebsiteSourcesList from "../components/WebsiteSourcesList";
import WebsiteCrawlForm from "../components/WebsiteCrawlForm";
import { useWebsiteSourceOperations } from "../hooks/useWebsiteSourceOperations";

const WebsiteTabContainer: React.FC = () => {
  const { agentId } = useParams();
  const queryClient = useQueryClient();
  
  const handleRefetch = () => {
    console.log('🔄 Refetch triggered');
    if (agentId) {
      queryClient.invalidateQueries({ queryKey: ['agent-source-stats', agentId] });
      queryClient.invalidateQueries({ queryKey: ['agent-sources-paginated', agentId, 'website'] });
    }
  };
  
  const handleRemoveFromState = (sourceId: string) => {
    console.log('🗑️ Remove from state:', sourceId);
  };

  const handleCrawlStarted = (parentSourceId: string) => {
    console.log('🚀 Crawl started for parent source:', parentSourceId);
    
    // Don't immediately invalidate - let the optimistic update handle it
    // Just schedule a delayed refresh to catch async updates
    setTimeout(() => {
      if (agentId) {
        console.log('🔄 Delayed refresh after crawl start');
        queryClient.invalidateQueries({
          queryKey: ['agent-source-stats', agentId]
        });
        queryClient.invalidateQueries({
          queryKey: ['agent-sources-paginated', agentId, 'website']
        });
      }
    }, 3000);
  };

  const {
    handleEdit,
    handleExclude,
    handleDelete,
    handleRecrawl
  } = useWebsiteSourceOperations(handleRefetch, handleRemoveFromState);

  return (
    <div className="space-y-6 mt-4">
      <WebsiteCrawlForm onCrawlStarted={handleCrawlStarted} />
      
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
