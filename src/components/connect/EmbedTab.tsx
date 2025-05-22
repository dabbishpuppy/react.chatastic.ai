
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
import { useChatSettings } from "@/hooks/useChatSettings";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";

interface EmbedTabProps {
  embedCode?: string;
  agentId?: string;
}

export const EmbedTab: React.FC<EmbedTabProps> = ({ embedCode = "", agentId }) => {
  const [copyText, setCopyText] = useState("Copy");
  const [embedType, setEmbedType] = useState<"bubble" | "iframe">("bubble");
  const [showIdentityVerification, setShowIdentityVerification] = useState(false);
  const { settings } = useChatSettings();
  
  const handleCopy = () => {
    const embedCode = getEmbedCode();
    if (embedCode) {
      navigator.clipboard.writeText(embedCode);
      setCopyText("Copied!");
      toast({
        title: "Code copied",
        description: "The embed code has been copied to your clipboard."
      });
      setTimeout(() => setCopyText("Copy"), 2000);
    }
  };

  const handleCopyVerification = () => {
    const verificationCode = document.querySelector(".verification-code code")?.textContent;
    if (verificationCode) {
      navigator.clipboard.writeText(verificationCode);
      toast({
        title: "Code copied",
        description: "The verification code has been copied to your clipboard."
      });
    }
  };
  
  const getEmbedCode = () => {
    if (embedType === "bubble") {
      // Create an array of config options that will be joined properly with commas
      const configOptions = [`agentId: "${agentId}"`, `position: "${settings.bubble_position || 'right'}"`];
      
      // Include chat icon in config if available
      if (settings.chat_icon) {
        configOptions.push(`chatIcon: "${settings.chat_icon}"`);
      }
      
      // Add user message color if available
      if (settings.user_message_color) {
        configOptions.push(`userMessageColor: "${settings.user_message_color}"`);
      }
      
      // Add bubble color (use user message color if sync is enabled, otherwise use primary color)
      if (settings.sync_colors && settings.user_message_color) {
        configOptions.push(`bubbleColor: "${settings.user_message_color}"`);
      } else if (settings.primary_color) {
        configOptions.push(`bubbleColor: "${settings.primary_color}"`);
      }
      
      // Add debug option
      configOptions.push(`debug: false // Set to true to enable debug logging`);
      
      // Improved script with more robust initialization and error handling
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
  
  // Load the script
  function loadScript() {
    console.log('[WonderWave] Loading chat widget script...');
    const script = document.createElement("script");
    script.src = "https://query-spark-start.lovable.app/wonderwave.js";
    script.async = true;
    script.onerror = function() {
      console.error('[WonderWave] Failed to load chat widget script!');
    };
    script.onload = function() {
      console.log('[WonderWave] Chat widget script loaded successfully');
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
      // Add color parameters to the iframe URL
      let iframeSrc = `https://query-spark-start.lovable.app/embed/${agentId}`;
      const params = [];
      
      if (settings.theme) {
        params.push(`theme=${encodeURIComponent(settings.theme)}`);
      }
      
      if (settings.user_message_color) {
        params.push(`userColor=${encodeURIComponent(settings.user_message_color)}`);
      }
      
      if (settings.sync_colors && settings.user_message_color) {
        params.push(`headerColor=${encodeURIComponent(settings.user_message_color)}`);
      } else if (settings.primary_color) {
        params.push(`headerColor=${encodeURIComponent(settings.primary_color)}`);
      }
      
      if (params.length > 0) {
        iframeSrc += `?${params.join('&')}`;
      }
      
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
          <CardDescription>Choose how to embed your agent on your website</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="bubble" className="w-full" onValueChange={(value) => setEmbedType(value as "bubble" | "iframe")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bubble">Chat Bubble</TabsTrigger>
              <TabsTrigger value="iframe">Iframe</TabsTrigger>
            </TabsList>
            <TabsContent value="bubble" className="pt-4">
              <div className="p-4 border rounded-md">
                <div className="flex items-start space-x-4">
                  <div className="flex-1">
                    <h3 className="font-medium mb-2">
                      Embed a chat bubble <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Recommended</span>
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Embed a chat bubble on your website that opens a chatbot when clicked. Customize the appearance in your <Link to={`/agent/${agentId}/settings/chat-interface`} className="text-blue-600 hover:underline">chat interface settings</Link>.
                    </p>

                    <div className="mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowIdentityVerification(!showIdentityVerification)}
                      >
                        {showIdentityVerification ? "Hide" : "Show"} Identity Verification
                      </Button>
                    </div>

                    {showIdentityVerification && (
                      <div className="mt-4 border p-4 rounded-md">
                        <h4 className="font-medium mb-2">For Identity Verification</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          On the server side, generate an HMAC hash using your secret key and the user ID:
                        </p>
                        
                        <div className="verification-code bg-gray-50 p-3 rounded-md text-xs overflow-x-auto mb-3">
                          <code>{`
const crypto = require('crypto');
const secret = '********'; // Your verification secret key
const userId = current_user.id // A string UUID to identify your user
const hash = crypto.createHmac('sha256', secret).update(userId).digest('hex');
                          `}</code>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="mt-2"
                            onClick={handleCopyVerification}
                          >
                            Copy
                          </Button>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          Then, include this hash in your chat bubble configuration:
                        </p>
                        
                        <div className="bg-gray-50 p-3 rounded-md text-xs overflow-x-auto">
                          <code>{`
<script>
  window.wonderwaveConfig = {
    agentId: "${agentId}",
    position: "${settings.bubble_position || 'right'}",
    identityHash: "YOUR_GENERATED_HASH", // Add the hash here
    userId: "USER_UUID" // The same user ID used to generate the hash
  };
</script>
                          `}</code>
                        </div>
                        
                        <div className="mt-3 text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
                          <strong>Important:</strong> Keep your secret key safe! Never commit it directly to your repository, client-side code, or anywhere a third party can find it.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="iframe" className="pt-4">
              <div className="p-4 border rounded-md">
                <div className="flex items-start space-x-4">
                  <div className="flex-1">
                    <h3 className="font-medium mb-2">
                      Embed the iframe directly
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Add the agent anywhere on your website as an embedded chat window. Customize the appearance in your <Link to={`/agent/${agentId}/settings/chat-interface`} className="text-blue-600 hover:underline">chat interface settings</Link>.
                    </p>
                    <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
                      <strong>Note:</strong> The iframe will automatically resize its height based on content.
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Embed code</h3>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copyText}
              </Button>
            </div>
            
            <div className="relative border rounded-md bg-gray-50 p-4">
              <pre className="text-xs overflow-x-auto max-h-60">
                <code className="block whitespace-pre">
                  {getEmbedCode()}
                </code>
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Need more help?</CardTitle>
          <CardDescription>Check out our documentation for more information on embedding your chatbot</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="mr-2">
            View Documentation
          </Button>
          <Button variant="outline">
            Contact Support
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmbedTab;
