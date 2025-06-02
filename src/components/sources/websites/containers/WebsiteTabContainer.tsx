
import React from "react";
import { useWebsiteSourceOperations } from "../hooks/useWebsiteSourceOperations";
import WebsiteSourcesList from "../components/WebsiteSourcesList";
import EnhancedWebsiteCrawlFormV3 from "../components/EnhancedWebsiteCrawlFormV3";
import FixSourcesButton from "../../FixSourcesButton";

const WebsiteTabContainer: React.FC = () => {
  const {
    handleEdit,
    handleExclude,
    handleDelete,
    handleRecrawl
  } = useWebsiteSourceOperations();

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Website Training</h2>
        <FixSourcesButton />
      </div>

      <EnhancedWebsiteCrawlFormV3 />
      
      <WebsiteSourcesList
        onEdit={handleEdit}
        onExclude={handleExclude}
        onDelete={handleDelete}
        onRecrawl={handleRecrawl}
      />
    </div>
  );
};

export default WebsiteTabContainer;
