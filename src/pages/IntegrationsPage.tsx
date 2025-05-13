
import React, { useState } from "react";
import TopNavBar from "@/components/layout/TopNavBar";
import { useParams } from "react-router-dom";
import AgentSidebar from "@/components/agent/AgentSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, LinkIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const IntegrationsPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [activeTab, setActiveTab] = useState("integrations");
  const [searchQuery, setSearchQuery] = useState("");

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

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
            <h1 className="text-3xl font-bold mb-6">Integrations</h1>
            
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search integrations..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredIntegrations.map((integration) => (
                <Card key={integration.name} className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="h-12 w-12 flex items-center justify-center rounded">
                        <img
                          src={integration.icon}
                          alt={`${integration.name} logo`}
                          className="h-8 w-8"
                        />
                      </div>
                    </div>
                    <CardTitle className="mt-2">{integration.name}</CardTitle>
                    <CardDescription>{integration.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="outline">
                      Connect
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;
