
import React, { useEffect, useState } from "react";
import AgentPageLayout from "./AgentPageLayout";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useChatSettings } from "@/hooks/useChatSettings";
import { getAgentVisibility } from "@/services/agentVisibilityService";
import { IntegrationsContent } from "@/components/connect/integrations/IntegrationsContent";

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
  
  // Set the URL parameter when the component mounts if it doesn't exist and hide chat bubble
  useEffect(() => {
    if (!searchParams.has("tab")) {
      navigate(`/agent/${agentId}/integrations?tab=embed`, { replace: true });
    }
    
    // Function to hide the chat bubble
    const hideChatBubble = () => {
      const existingBubble = document.getElementById('wonderwave-bubble');
      if (existingBubble) {
        existingBubble.style.display = 'none';
        existingBubble.style.visibility = 'hidden';
        existingBubble.style.opacity = '0';
        existingBubble.style.pointerEvents = 'none';
        console.log('Chat bubble hidden on integrations page');
      }
    };

    // Hide immediately if it exists
    hideChatBubble();

    // Set up MutationObserver to watch for dynamically added chat bubbles
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            // Check if the added node is the chat bubble or contains it
            if (element.id === 'wonderwave-bubble' || element.querySelector('#wonderwave-bubble')) {
              hideChatBubble();
            }
          }
        });
      });
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also set up an interval as a fallback
    const intervalId = setInterval(hideChatBubble, 500);
    
    // Cleanup when leaving the page
    return () => {
      observer.disconnect();
      clearInterval(intervalId);
      const bubble = document.getElementById('wonderwave-bubble');
      if (bubble) {
        bubble.style.display = 'flex';
        bubble.style.visibility = 'visible';
        bubble.style.opacity = '1';
        bubble.style.pointerEvents = 'auto';
      }
    };
  }, [agentId, navigate, searchParams]);

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
      </div>
    </AgentPageLayout>
  );
};

export default IntegrationsPage;
