
import React, { useState } from "react";
import AgentPageLayout from "./AgentPageLayout";
import ChatSection from "@/components/agent/ChatSection";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import LLMSettingsPanel from "@/components/agent/LLMSettingsPanel";

const AgentEnvironment = () => {
  const [showSettings, setShowSettings] = useState(false);

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  // Render the title actions with the gear icon and text
  const renderTitleActions = () => (
    <Button 
      variant="ghost" 
      onClick={toggleSettings} 
      className="flex items-center gap-2"
    >
      <span>Agent Settings</span>
      <Settings size={20} />
    </Button>
  );

  return (
    <AgentPageLayout 
      defaultActiveTab="playground" 
      defaultPageTitle="Playground"
      titleActions={renderTitleActions()}
      showPageTitle={true}
    >
      <div className="flex h-full">
        <div className="flex-1">
          <ChatSection />
        </div>
        
        {showSettings && (
          <div className="w-96 border-l border-gray-200 bg-white">
            <LLMSettingsPanel onClose={toggleSettings} />
          </div>
        )}
      </div>
    </AgentPageLayout>
  );
};

export default AgentEnvironment;
