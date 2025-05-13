
import React from "react";
import AgentPageLayout from "./AgentPageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChatSection from "@/components/agent/ChatSection";
import ConversationView from "@/components/agent/ConversationView";
import LLMSettingsPanel from "@/components/agent/LLMSettingsPanel";

const AgentEnvironment: React.FC = () => {
  return (
    <AgentPageLayout defaultActiveTab="playground" defaultPageTitle="Playground">
      <Tabs defaultValue="chat" className="w-full">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="configure">Configure</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="flex flex-1 h-full overflow-hidden">
          <div className="flex flex-1">
            <div className="flex-1 overflow-hidden">
              <ChatSection />
            </div>
            <div className="w-64 border-l">
              <ConversationView />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="configure">
          <LLMSettingsPanel />
        </TabsContent>
      </Tabs>
    </AgentPageLayout>
  );
};

export default AgentEnvironment;
