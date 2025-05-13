
import React, { useState } from "react";
import TopNavBar from "@/components/layout/TopNavBar";
import { useParams, useNavigate } from "react-router-dom";
import AgentSidebar from "@/components/agent/AgentSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Zap, ExternalLink, Puzzle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ActionsPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("actions");
  const [searchQuery, setSearchQuery] = useState("");

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Empty state - setting to true will show the empty state UI
  const isEmpty = true;

  const integrations = [
    {
      name: "Slack",
      description: "Manage your Slack conversations.",
      icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@develop/icons/slack.svg",
    },
    {
      name: "Stripe",
      description: "Manage payments, billing, and automate financial operations.",
      icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@develop/icons/stripe.svg",
    },
    {
      name: "Calendly",
      description: "Manage your Calendly events.",
      icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@develop/icons/calendly.svg",
    },
    {
      name: "Zendesk",
      description: "Create Zendesk tickets.",
      icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@develop/icons/zendesk.svg",
    },
    {
      name: "Zapier",
      description: "Connect with thousands of apps.",
      icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@develop/icons/zapier.svg",
    },
  ];

  const filteredIntegrations = searchQuery
    ? integrations.filter(integration =>
        integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        integration.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : integrations;

  return (
    <div className="flex flex-col min-h-screen">
      <TopNavBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-64 border-r overflow-y-auto bg-white">
          <div className="p-6">
            <h1 className="text-2xl font-bold">Playground</h1>
          </div>
          <AgentSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl">
            <h1 className="text-3xl font-bold mb-6">Actions</h1>

            {/* Empty state for first time users */}
            {isEmpty && (
              <div className="text-center py-20 max-w-xl mx-auto">
                <div className="rounded-full bg-gray-100 p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Create your first action</h2>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                  Customize how your users interact with the chatbot,
                  connect to an integration or create your own actions.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button className="bg-black hover:bg-gray-800">
                    Create action
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`/agent/${agentId}/integrations`)}>
                    View all integrations
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionsPage;
