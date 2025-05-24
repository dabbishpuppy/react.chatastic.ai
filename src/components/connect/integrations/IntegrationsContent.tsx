
import React from "react";
import EmbedTab from "@/components/connect/EmbedTab";
import ShareTab from "@/components/connect/ShareTab";
import { integrations } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface IntegrationsContentProps {
  tab: string;
  agentId?: string;
  getEmbedCode: () => string;
  visibility: string;
  visibilityError: boolean;
  isLoading: boolean;
}

export const IntegrationsContent: React.FC<IntegrationsContentProps> = ({
  tab,
  agentId,
  getEmbedCode,
  visibility,
  visibilityError,
  isLoading
}) => {
  const navigate = useNavigate();
  
  // Render visibility restriction warning if agent is private
  const renderVisibilityWarning = () => {
    if (visibility === "private") {
      return (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Private Agent</AlertTitle>
          <AlertDescription>
            This agent is currently set to private. It cannot be embedded or shared with others.
            To enable embedding and sharing, change the agent's visibility to 'Public' in the Security settings.
          </AlertDescription>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => navigate(`/agent/${agentId}/settings/security`)}
          >
            Go to Security Settings
          </Button>
        </Alert>
      );
    }
    return null;
  };

  // Render error message if visibility fetch fails
  const renderVisibilityError = () => {
    if (visibilityError) {
      return (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            There was a problem fetching the agent's visibility status. The preview may not be available.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  // Show error if visibility fetch failed
  if (visibilityError) {
    return renderVisibilityError();
  }
  
  // If agent is private, don't show the regular tab content
  if (visibility === "private") {
    return renderVisibilityWarning();
  }
  
  // Always render the EmbedTab since we removed the tabs - no matter what tab is requested
  if (tab === "embed" || tab === "share" || tab === "integrations") {
    if (tab === "share") {
      return <ShareTab />;
    } else if (tab === "integrations") {
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
    } else {
      // Default to embed tab
      return <EmbedTab embedCode={getEmbedCode()} agentId={agentId} />;
    }
  }
  
  // Fallback to embed tab
  return <EmbedTab embedCode={getEmbedCode()} agentId={agentId} />;
};
