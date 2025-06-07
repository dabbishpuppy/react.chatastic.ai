
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

  const handleCrawlStarted = (parentSourceId: string) => {
    console.log('🚀 Crawl started for parent source:', parentSourceId);
    
    // Immediately invalidate and refetch both stats and paginated data
    if (agentId) {
      console.log('🔄 Invalidating queries for immediate update');
      
      // Invalidate stats query
      queryClient.invalidateQueries({ 
        queryKey: ['agent-source-stats', agentId] 
      });
      
      // Invalidate paginated sources query
      queryClient.invalidateQueries({ 
        queryKey: ['agent-sources-paginated', agentId, 'website'] 
      });
      
      // Force immediate refetch
      setTimeout(() => {
        queryClient.refetchQueries({
          queryKey: ['agent-source-stats', agentId]
        });
        queryClient.refetchQueries({
          queryKey: ['agent-sources-paginated', agentId, 'website']
        });
      }, 100);
      
      // Additional refetch after a short delay to catch any async updates
      setTimeout(() => {
        queryClient.refetchQueries({
          queryKey: ['agent-source-stats', agentId]
        });
        queryClient.refetchQueries({
          queryKey: ['agent-sources-paginated', agentId, 'website']
        });
      }, 1000);
    }
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
