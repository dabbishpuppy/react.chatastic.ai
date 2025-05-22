
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface TabNavigationProps {
  activeTab: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab }) => {
  const navigate = useNavigate();
  const { agentId } = useParams();
  
  const tabs = [
    { id: "embed", label: "Embed" },
    { id: "share", label: "Share" },
    { id: "integrations", label: "Integrations" }
  ];
  
  const handleTabChange = (tabId: string) => {
    navigate(`/agent/${agentId}/integrations?tab=${tabId}`);
  };
  
  return (
    <div className="mb-6 border-b">
      <div className="flex space-x-2">
        {tabs.map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            className={`rounded-none border-b-2 ${
              activeTab === tab.id ? "border-primary" : "border-transparent"
            }`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
