
import React, { useEffect, useState } from "react";
import AgentPageLayout from "./AgentPageLayout";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useChatSettings } from "@/hooks/useChatSettings";
import { getAgentVisibility } from "@/services/agentVisibilityService";
import { IntegrationsContent } from "@/components/connect/integrations/IntegrationsContent";
import { TabNavigation } from "@/components/connect/integrations/TabNavigation";
import { ChatbotPreview } from "@/components/connect/integrations/ChatbotPreview";

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
  const [visibilityError, setVisibilityError] = useState<boolean>(false);
  
  // Fetch agent visibility when the component mounts
  useEffect(() => {
    const fetchAgentVisibility = async () => {
      if (!agentId) return;
      
      try {
        setVisibilityError(false);
        const data = await getAgentVisibility(agentId);
        
        if (data) {
          setVisibility(data.visibility);
        } else if (data === null) {
          // Agent not found
          console.log("No agent found with ID:", agentId);
          setVisibility("private");
          setVisibilityError(true);
        } else {
          // Default to public if we get some other response
          setVisibility("public");
        }
      } catch (error) {
        console.error("Error in fetchAgentVisibility:", error);
        setVisibilityError(true);
        setVisibility("private"); // Default to private on error for security
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

  return (
    <AgentPageLayout defaultActiveTab="connect" defaultPageTitle={getTabTitle()} showPageTitle={false}>
      <div className="p-8 bg-[#f5f5f5] overflow-hidden min-h-screen">
        <h1 className="text-3xl font-bold mb-6">{getTabTitle()}</h1>
        
        <TabNavigation activeTab={tab} />
        
        <div className="bg-white rounded-lg p-6">
          <IntegrationsContent
            tab={tab}
            agentId={agentId}
            getEmbedCode={getEmbedCode}
            visibility={visibility}
            visibilityError={visibilityError}
            isLoading={isLoading || visibilityLoading}
          />
        </div>
        
        {/* Preview the chatbot widget */}
        <ChatbotPreview
          settings={settings}
          tab={tab}
          visibility={visibility}
          visibilityError={visibilityError}
        />
      </div>
    </AgentPageLayout>
  );
};

export default IntegrationsPage;
