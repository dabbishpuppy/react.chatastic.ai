
import React, { useState } from "react";
import AgentPageLayout from "./AgentPageLayout";
import ChatSection from "@/components/agent/ChatSection";
import ConversationView from "@/components/agent/ConversationView";
import LLMSettingsPanel from "@/components/agent/LLMSettingsPanel";
import { Conversation } from "@/components/activity/ConversationData";

const AgentEnvironment: React.FC = () => {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const handleCloseConversation = () => {
    setActiveConversation(null);
  };

  return (
    <AgentPageLayout defaultActiveTab="playground" defaultPageTitle="Playground">
      <div className="w-full h-full flex overflow-hidden">
        <div 
          className="flex-1 p-6 overflow-hidden"
          style={{ 
            backgroundImage: 'radial-gradient(#e0e0e0 1px, transparent 1px)', 
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0',
            backgroundColor: '#f9f9f9'
          }}
        >
          {/* White chat container on top of dotted background */}
          <div className="w-full h-full rounded-lg overflow-hidden bg-white shadow-sm border border-gray-100">
            <ChatSection />
          </div>
        </div>
        
        {/* Hide the sidebar that was previously visible */}
        <div className="hidden">
          <ConversationView 
            conversation={activeConversation}
            onClose={handleCloseConversation}
          />
        </div>
      </div>
    </AgentPageLayout>
  );
};

export default AgentEnvironment;
