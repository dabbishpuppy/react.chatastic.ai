
import React, { useState } from "react";
import TopNavBar from "@/components/layout/TopNavBar";
import { useParams } from "react-router-dom";
import AgentSidebar from "@/components/agent/AgentSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Zap, ExternalLink, Puzzle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ActionsPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [activeTab, setActiveTab] = useState("actions");
  const [activeTabView, setActiveTabView] = useState("actions");
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

            <Tabs 
              defaultValue="actions" 
              value={activeTabView} 
              onValueChange={setActiveTabView} 
              className="w-full mb-8"
            >
              <TabsList>
                <TabsTrigger value="actions" className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Actions
                </TabsTrigger>
                <TabsTrigger value="integrations" className="flex items-center gap-2">
                  <Puzzle className="h-5 w-5" />
                  Integrations
                </TabsTrigger>
              </TabsList>

              <TabsContent value="actions" className="mt-6">
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
                      <Button variant="outline" onClick={() => setActiveTabView("integrations")}>
                        View all integrations
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="integrations" className="mt-6">
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
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionsPage;
