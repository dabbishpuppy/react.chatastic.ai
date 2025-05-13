
import React, { useState } from "react";
import AgentPageLayout from "./AgentPageLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Embed, Share, integrations } from "@/lib/utils";

const IntegrationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("integrations");

  return (
    <AgentPageLayout defaultActiveTab="connect" defaultPageTitle="Connect">
      <Tabs defaultValue="integrations" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="mb-4 grid w-full grid-cols-3">
          <TabsTrigger value="embed">Embed</TabsTrigger>
          <TabsTrigger value="share">Share</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="embed" className="mt-4">
          <Embed />
        </TabsContent>
        
        <TabsContent value="share" className="mt-4">
          <Share />
        </TabsContent>
        
        <TabsContent value="integrations" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integration) => (
              <Card key={integration.name}>
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
    </AgentPageLayout>
  );
};

export default IntegrationsPage;
