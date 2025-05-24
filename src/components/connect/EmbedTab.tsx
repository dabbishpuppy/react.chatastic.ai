
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { useChatSettings } from "@/hooks/useChatSettings";
import { ChatBubbleTab } from "./embed/ChatBubbleTab";
import { IframeTab } from "./embed/IframeTab";
import { EmbedCodeDisplay } from "./embed/EmbedCodeDisplay";
import { HelpSection } from "./embed/HelpSection";

interface EmbedTabProps {
  embedCode?: string;
  agentId?: string;
}

export const EmbedTab: React.FC<EmbedTabProps> = ({ embedCode = "", agentId }) => {
  const [embedType, setEmbedType] = useState<"bubble" | "iframe">("bubble");
  const { settings } = useChatSettings();
  
  const getEmbedCode = () => {
    if (embedType === "bubble") {
      // Create an array of config options that will include only agentId
      const configOptions = [
        `agentId: "${agentId}"`,
      ];
      
      // Updated script with absolute URL loading to fix 404 errors on external websites
      return `<script>
(function(){
  // Define the config first - this is crucial
  window.wonderwaveConfig = {
    ${configOptions.join(',\n    ')}
  };
  
  // Create a proxy handler for the wonderwave function
  function createWonderwaveProxy() {
    // Create a queue if it doesn't exist
    if(!window.wonderwave || !window.wonderwave.q) {
      window.wonderwave = function(...args) {
        window.wonderwave.q = window.wonderwave.q || [];
        window.wonderwave.q.push(args);
        return null; // Return null by default before init
      };
      window.wonderwave.q = [];
    }
    
    // Return a proxy to handle methods more elegantly
    return new Proxy(window.wonderwave, {
      get(target, prop) {
        if (prop === 'q') return target.q;
        return (...args) => target(prop, ...args);
      }
    });
  }
  
  // Set up wonderwave with the proxy pattern
  window.wonderwave = createWonderwaveProxy();
  
  // Load the script with absolute URL to prevent 404 errors
  function loadScript() {
    const script = document.createElement("script");
    script.src = "https://query-spark-start.lovable.app/wonderwave.js";
    script.async = true;
    script.onerror = function() {
      console.error('[WonderWave] Failed to load chat widget script!');
    };
    document.head.appendChild(script);
  }

  // Load the script when the page is ready
  if (document.readyState === "complete" || document.readyState === "interactive") {
    // If already loaded
    setTimeout(loadScript, 1);
  } else {
    // Wait for DOMContentLoaded
    window.addEventListener("DOMContentLoaded", loadScript);
  }
})();
</script>`;
    } else {
      // Add only agent ID to the iframe URL - colors will be loaded from the backend
      let iframeSrc = `https://query-spark-start.lovable.app/embed/${agentId}`;
      
      // Simplified iframe embedding code
      return `<iframe
  src="${iframeSrc}"
  width="100%"
  style="height: 100%; min-height: 700px"
  frameborder="0"
></iframe>`;
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Embed your AI chatbot</CardTitle>
          <CardDescription>
            Choose how to embed your agent on your website.
            Any color settings updated here will be automatically applied everywhere the widget is embedded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="bubble" className="w-full" onValueChange={(value) => setEmbedType(value as "bubble" | "iframe")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bubble">Chat Bubble</TabsTrigger>
              <TabsTrigger value="iframe">Iframe</TabsTrigger>
            </TabsList>
            <TabsContent value="bubble" className="pt-4">
              <ChatBubbleTab agentId={agentId} />
            </TabsContent>
            
            <TabsContent value="iframe" className="pt-4">
              <IframeTab agentId={agentId} />
            </TabsContent>
          </Tabs>
          
          <EmbedCodeDisplay getEmbedCode={getEmbedCode} />
        </CardContent>
      </Card>
      
      <HelpSection />
    </div>
  );
};

export default EmbedTab;
