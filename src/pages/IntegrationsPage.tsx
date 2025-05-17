
import React, { useEffect } from "react";
import AgentPageLayout from "./AgentPageLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { integrations } from "@/lib/utils";
import EmbedTab from "@/components/connect/EmbedTab";
import ShareTab from "@/components/connect/ShareTab";
import { useParams, useNavigate, useLocation } from "react-router-dom";

const IntegrationsPage: React.FC = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tab = searchParams.get("tab") || "embed";
  
  // Set the URL parameter when the component mounts if it doesn't exist
  useEffect(() => {
    if (!searchParams.has("tab")) {
      navigate(`/agent/${agentId}/integrations?tab=embed`, { replace: true });
    }
  }, []);

  // Get the current tab title
  const getTabTitle = () => {
    switch(tab) {
      case "embed": return "Embed";
      case "share": return "Share";
      case "integrations": return "Integrations";
      default: return "Embed";
    }
  };

  // Render the appropriate tab content based on the URL parameter
  const renderTabContent = () => {
    switch (tab) {
      case "embed":
        return <EmbedTab />;
      case "share":
        return <ShareTab />;
      case "integrations":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integration) => (
              <Card key={integration.name} className="bg-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <img src={integration.image} alt={integration.name} className="h-8" />
                  </div>
                  <CardTitle className="mt-4">{integration.name}</CardTitle>
                  <CardDescription>{integration.description}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="outline" className="w-full">Connect</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        );
      default:
        return <EmbedTab />;
    }
  };

  return (
    <AgentPageLayout defaultActiveTab="connect" defaultPageTitle={getTabTitle()} showPageTitle={false}>
      <div className="p-8 bg-[#f5f5f5] overflow-hidden min-h-screen">
        <h1 className="text-3xl font-bold mb-6">{getTabTitle()}</h1>
        <div className="bg-white rounded-lg p-6">
          {renderTabContent()}
        </div>
      </div>
    </AgentPageLayout>
  );
};

export default IntegrationsPage;
