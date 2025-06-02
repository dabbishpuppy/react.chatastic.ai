
import React from "react";
import EnhancedWebsiteCrawlFormV3 from "./EnhancedWebsiteCrawlFormV3";

interface WebsiteCrawlFormProps {
  url?: string;
  setUrl?: (url: string) => void;
  protocol?: string;
  setProtocol?: (protocol: string) => void;
  includePaths?: string;
  setIncludePaths?: (paths: string) => void;
  excludePaths?: string;
  setExcludePaths?: (paths: string) => void;
  onSubmit?: (options?: { maxPages?: number; maxDepth?: number; concurrency?: number }) => Promise<void>;
  isSubmitting?: boolean;
  buttonText?: string;
  showFilters?: boolean;
}

const WebsiteCrawlForm: React.FC<WebsiteCrawlFormProps> = ({
  url,
  setUrl,
  protocol,
  setProtocol,
  includePaths,
  setIncludePaths,
  excludePaths,
  setExcludePaths,
  onSubmit,
  isSubmitting,
  buttonText,
  showFilters
}) => {
  // If no props are provided, render the default layout
  if (!url && !setUrl) {
    return (
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Website Training</h2>
        <EnhancedWebsiteCrawlFormV3 />
      </div>
    );
  }

  // If props are provided, pass them to EnhancedWebsiteCrawlFormV3
  return (
    <EnhancedWebsiteCrawlFormV3
      url={url}
      setUrl={setUrl}
      protocol={protocol}
      setProtocol={setProtocol}
      includePaths={includePaths}
      setIncludePaths={setIncludePaths}
      excludePaths={excludePaths}
      setExcludePaths={setExcludePaths}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      buttonText={buttonText}
      showFilters={showFilters}
    />
  );
};

export default WebsiteCrawlForm;
