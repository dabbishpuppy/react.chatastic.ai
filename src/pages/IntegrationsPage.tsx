
import React, { useState } from "react";
import AgentPageLayout from "./AgentPageLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { integrations } from "@/lib/utils";
import EmbedTab from "@/components/connect/EmbedTab";
import ShareTab from "@/components/connect/ShareTab";

const IntegrationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("embed");

  return (
    <AgentPageLayout defaultActiveTab="integrations" defaultPageTitle="Integrations">
      <div className="p-8 bg-[#f5f5f5] overflow-hidden min-h-screen">
        <h1 className="text-3xl font-bold mb-6">Integrations</h1>
        <div className="bg-white rounded-lg p-6">
          <Tabs defaultValue="embed" onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="embed">Embed</TabsTrigger>
              <TabsTrigger value="share">Share</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="embed" className="mt-4">
              <EmbedTab />
            </TabsContent>
            
            <TabsContent value="share" className="mt-4">
              <ShareTab />
            </TabsContent>
            
            <TabsContent value="integrations" className="mt-4">
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AgentPageLayout>
  );
};

export default IntegrationsPage;
