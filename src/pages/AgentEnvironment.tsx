
import React, { useState } from "react";
import AgentPageLayout from "./AgentPageLayout";
import ChatSection from "@/components/agent/ChatSection";
import ConversationView from "@/components/agent/ConversationView";
import LLMSettingsPanel from "@/components/agent/LLMSettingsPanel";
import { Conversation } from "@/components/activity/ConversationData";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const AgentEnvironment: React.FC = () => {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleCloseConversation = () => {
    setActiveConversation(null);
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  return (
    <AgentPageLayout defaultActiveTab="playground" defaultPageTitle="Playground">
      <div className="w-full h-full flex overflow-hidden">
        {/* Main content area with dotted background pattern that fills the entire section */}
        <div 
          className="flex-1 overflow-hidden flex justify-center items-center"
          style={{ 
            backgroundImage: 'radial-gradient(#e0e0e0 1px, transparent 1px)', 
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0',
            backgroundColor: '#f9f9f9'
          }}
        >
          {/* White chat container on top of dotted background with max-width */}
          <div className="max-w-[30rem] w-full h-full mx-auto p-6">
            <div className="w-full h-full rounded-lg overflow-hidden bg-white shadow-sm border border-gray-100">
              <ChatSection toggleSettings={toggleSettings} />
            </div>
          </div>
        </div>
        
        {/* Settings sidebar - only visible when showSettings is true */}
        {showSettings && (
          <div className="w-80 border-l border-gray-200 bg-white">
            <LLMSettingsPanel />
          </div>
        )}
      </div>
    </AgentPageLayout>
  );
};

export default AgentEnvironment;
