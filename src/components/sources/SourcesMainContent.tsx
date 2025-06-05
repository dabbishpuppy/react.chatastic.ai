
import React from "react";
import { useTabNavigation } from "./hooks/useTabNavigation";
import { useAgentSourceStats } from "@/hooks/useAgentSourceStats";
import TextTab from "./TextTab";
import FilesTab from "./FilesTab";
import WebsiteTab from "./WebsiteTab";
import QATab from "./QATab";
import SimplifiedSourcesWidget from "./SimplifiedSourcesWidget";
import SourcesLoadingState from "./SourcesLoadingState";
import SourcesErrorState from "./SourcesErrorState";

const SourcesMainContent: React.FC = () => {
  const { currentTab } = useTabNavigation();
  const { data: stats, isLoading, error } = useAgentSourceStats();

  const formatTotalSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  if (isLoading) {
    return <SourcesLoadingState />;
  }

  if (error) {
    return <SourcesErrorState error={error.message} />;
  }

  const renderTabContent = () => {
    switch (currentTab) {
      case "text":
        return <TextTab />;
      case "files":
        return <FilesTab />;
      case "website":
        return <WebsiteTab />;
      case "qa":
        return <QATab />;
      default:
        return <TextTab />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
        {renderTabContent()}
      </div>
      
      <div className="lg:w-80">
        <SimplifiedSourcesWidget
          currentTab={currentTab}
          sourcesByType={stats?.sourcesByType}
          totalSize={stats ? formatTotalSize(stats.totalBytes) : "0 B"}
        />
      </div>
    </div>
  );
};

export default SourcesMainContent;
