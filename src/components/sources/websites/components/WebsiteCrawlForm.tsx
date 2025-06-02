
import React from "react";
import EnhancedWebsiteCrawlFormV3 from "./EnhancedWebsiteCrawlFormV3";

const WebsiteCrawlForm: React.FC = () => {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-semibold">Website Training</h2>
      <EnhancedWebsiteCrawlFormV3 />
    </div>
  );
};

export default WebsiteCrawlForm;
