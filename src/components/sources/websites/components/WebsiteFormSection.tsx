
import React from 'react';
import EnhancedWebsiteCrawlFormV3 from "./EnhancedWebsiteCrawlFormV3";

interface WebsiteFormSectionProps {
  activeSubTab?: string;
  setActiveSubTab?: (tab: string) => void;
  url?: string;
  setUrl?: (url: string) => void;
  protocol?: string;
  setProtocol?: (protocol: string) => void;
  includePaths?: string;
  setIncludePaths?: (paths: string) => void;
  excludePaths?: string;
  setExcludePaths?: (paths: string) => void;
  onSubmit?: (crawlType: 'crawl-links' | 'sitemap' | 'individual-link', options?: { maxPages?: number; maxDepth?: number; concurrency?: number }) => Promise<void>;
  isSubmitting?: boolean;
}

const WebsiteFormSection: React.FC<WebsiteFormSectionProps> = () => {
  const handleCrawlStarted = (parentSourceId: string) => {
    console.log('Crawl started with parent source ID:', parentSourceId);
  };

  return (
    <div>
      <EnhancedWebsiteCrawlFormV3 onCrawlStarted={handleCrawlStarted} />
    </div>
  );
};

export default WebsiteFormSection;
