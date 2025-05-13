
import React from "react";
import AgentPageLayout from "./AgentPageLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const IntegrationsPage: React.FC = () => {
  const integrations = [
    {
      name: "Zapier",
      description: "Connect with 5,000+ apps",
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Zapier_logo.svg/1200px-Zapier_logo.svg.png",
    },
    {
      name: "Slack",
      description: "Connect with Slack channels",
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Slack_Technologies_Logo.svg/2560px-Slack_Technologies_Logo.svg.png",
    },
    {
      name: "Webhooks",
      description: "Create custom webhooks",
      image: "https://cdn-icons-png.flaticon.com/512/25/25231.png",
    },
  ];

  return (
    <AgentPageLayout defaultActiveTab="integrations" defaultPageTitle="Integrations">
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
    </AgentPageLayout>
  );
};

export default IntegrationsPage;
