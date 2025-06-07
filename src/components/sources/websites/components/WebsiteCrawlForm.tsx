
import React from "react";
import EnhancedWebsiteCrawlFormV3 from "./EnhancedWebsiteCrawlFormV3";

interface WebsiteCrawlFormProps {
  onCrawlStarted?: (parentSourceId: string) => void;
}

const WebsiteCrawlForm: React.FC<WebsiteCrawlFormProps> = ({
  onCrawlStarted
}) => {
  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Website Training</h2>
      </div>
      <EnhancedWebsiteCrawlFormV3 onCrawlStarted={onCrawlStarted} />
    </div>
  );
};

export default WebsiteCrawlForm;
