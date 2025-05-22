
import React, { useEffect, useState } from "react";
import AgentPageLayout from "./AgentPageLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { integrations } from "@/lib/utils";
import EmbedTab from "@/components/connect/EmbedTab";
import ShareTab from "@/components/connect/ShareTab";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useChatSettings } from "@/hooks/useChatSettings";
import ChatbotWidget from "@/components/chatbot/ChatbotWidget";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const IntegrationsPage: React.FC = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tab = searchParams.get("tab") || "embed";
  
  // Use chat settings to get the latest settings
  const { settings, isLoading } = useChatSettings();
  
  // Add state for agent visibility
  const [visibility, setVisibility] = useState<string>("public");
  const [visibilityLoading, setVisibilityLoading] = useState<boolean>(true);
  
  // Fetch agent visibility when the component mounts
  useEffect(() => {
    const fetchAgentVisibility = async () => {
      if (!agentId) return;
      
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('visibility')
          .eq('id', agentId)
          .single();
          
        if (error) {
          console.error("Error fetching agent visibility:", error);
          return;
        }
        
        if (data) {
          setVisibility(data.visibility);
        }
      } catch (error) {
        console.error("Error in fetchAgentVisibility:", error);
      } finally {
        setVisibilityLoading(false);
      }
    };
    
    fetchAgentVisibility();
  }, [agentId]);
  
  // Set the URL parameter when the component mounts if it doesn't exist
  useEffect(() => {
    if (!searchParams.has("tab")) {
      navigate(`/agent/${agentId}/integrations?tab=embed`, { replace: true });
    }
    
    // Hide any existing chat widget on this page
    const existingBubble = document.getElementById('wonderwave-bubble');
    if (existingBubble) {
      existingBubble.style.display = 'none';
    }
    
    // Cleanup when leaving the page
    return () => {
      const bubble = document.getElementById('wonderwave-bubble');
      if (bubble) {
        bubble.style.display = 'flex';
      }
    };
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

  // Generate embed code based on the current agent ID and settings
  const getEmbedCode = () => {
    if (!agentId) return '';
    
    return `<script>
(function(){
  if(!window.wonderwaveConfig) {
    window.wonderwaveConfig = {
      agentId: "${agentId}",
    };
  }
  
  if(!window.wonderwave||window.wonderwave("getState")!=="initialized"){
    window.wonderwave=(...args)=>{
      if(!window.wonderwave.q){window.wonderwave.q=[];}
      window.wonderwave.q.push(args);
    };
    
    const script = document.createElement("script");
    script.src = "https://query-spark-start.lovable.app/wonderwave.js";
    script.async = true;
    document.head.appendChild(script);
  }
})();
</script>`;
  };

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

  // Render the appropriate tab content based on the URL parameter
  const renderTabContent = () => {
    // If agent is private, don't show the regular tab content
    if (visibility === "private") {
      return renderVisibilityWarning();
    }
    
    switch (tab) {
      case "embed":
        return <EmbedTab embedCode={getEmbedCode()} agentId={agentId} />;
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
        return <EmbedTab embedCode={getEmbedCode()} agentId={agentId} />;
    }
  };

  return (
    <AgentPageLayout defaultActiveTab="connect" defaultPageTitle={getTabTitle()} showPageTitle={false}>
      <div className="p-8 bg-[#f5f5f5] overflow-hidden min-h-screen">
        <h1 className="text-3xl font-bold mb-6">{getTabTitle()}</h1>
        <div className="bg-white rounded-lg p-6">
          {isLoading || visibilityLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            renderTabContent()
          )}
        </div>
        
        {/* Preview the chatbot widget with current settings - only show on embed tab */}
        {settings && tab === "embed" && visibility === "public" && (
          <ChatbotWidget 
            productName="Your Website"
            botName={settings.display_name}
            primaryColor="#000000"
            showPopups={true}
            theme={settings.theme}
            bubblePosition={settings.bubble_position}
            autoShowDelay={settings.auto_show_delay}
            showFeedback={settings.show_feedback}
            allowRegenerate={settings.allow_regenerate}
            initialMessage={settings.initial_message}
            suggestedMessages={settings.suggested_messages.map(msg => msg.text)}
            showSuggestions={settings.show_suggestions_after_chat}
            messagePlaceholder={settings.message_placeholder}
            footer={settings.footer}
            chatIcon={settings.chat_icon}
            profilePicture={settings.profile_picture}
          />
        )}
      </div>
    </AgentPageLayout>
  );
};

export default IntegrationsPage;
