
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Eye } from "lucide-react";
import { ChatBubbleTab } from "./embed/ChatBubbleTab";
import { IframeTab } from "./embed/IframeTab";
import { HelpSection } from "./embed/HelpSection";
import { useToast } from "@/hooks/use-toast";

interface EmbedTabProps {
  embedCode: string;
  agentId?: string;
}

const EmbedTab: React.FC<EmbedTabProps> = ({ embedCode, agentId }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Code copied to clipboard"
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the code manually",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Embed your agent</h2>
        <p className="text-gray-600 mt-2">
          Add your AI agent to any website with these simple embed options.
        </p>
      </div>

      <Tabs defaultValue="bubble" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bubble">Chat Bubble</TabsTrigger>
          <TabsTrigger value="iframe">Iframe</TabsTrigger>
        </TabsList>
        
        <TabsContent value="bubble">
          <ChatBubbleTab 
            agentId={agentId} 
            onCopy={copyToClipboard} 
            embedCode={embedCode}
          />
        </TabsContent>
        
        <TabsContent value="iframe">
          <IframeTab agentId={agentId} onCopy={copyToClipboard} />
        </TabsContent>
      </Tabs>

      <HelpSection />
    </div>
  );
};

export default EmbedTab;
