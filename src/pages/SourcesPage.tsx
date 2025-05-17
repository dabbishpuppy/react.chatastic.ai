
import React, { useEffect } from "react";
import AgentPageLayout from "./AgentPageLayout";
import TextTab from "@/components/sources/TextTab";
import FilesTab from "@/components/sources/FilesTab";
import WebsiteTab from "@/components/sources/WebsiteTab";
import QATab from "@/components/sources/QATab";
import { useNavigate, useParams, useLocation } from "react-router-dom";

const SourcesPage: React.FC = () => {
  const navigate = useNavigate();
  const { agentId } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tab = searchParams.get("tab") || "text";
  
  // Set the URL parameter when the component mounts if it doesn't exist
  useEffect(() => {
    if (!searchParams.has("tab")) {
      navigate(`/agent/${agentId}/sources?tab=text`, { replace: true });
    }
  }, []);

  // Render the appropriate tab content based on the URL parameter
  const renderTabContent = () => {
    switch (tab) {
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
    <AgentPageLayout defaultActiveTab="sources" defaultPageTitle="Sources" showPageTitle={false}>
      <div className="p-8 bg-[#f5f5f5] overflow-hidden min-h-screen">
        <h1 className="text-3xl font-bold mb-6">Sources</h1>
        <div className="bg-white rounded-lg p-6">
          {renderTabContent()}
        </div>
      </div>
    </AgentPageLayout>
  );
};

export default SourcesPage;
