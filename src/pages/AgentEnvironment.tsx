
import React, { useState } from "react";
import AgentPageLayout from "./AgentPageLayout";
import ChatSection from "@/components/agent/ChatSection";
import LLMSettingsPanel from "@/components/agent/LLMSettingsPanel";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

const AgentEnvironment: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const headerActions = (
    <Button 
      variant="outline" 
      onClick={toggleSettings} 
      className="flex items-center bg-white"
    >
      <Settings size={18} className="mr-2" />
      Agent Settings
    </Button>
  );

  return (
    <AgentPageLayout 
      defaultActiveTab="playground" 
      defaultPageTitle="Playground"
      headerActions={headerActions}
    >
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
          {/* White chat container on top of dotted background with max-width and padding top/bottom */}
          <div className="max-w-[30rem] w-full h-full py-8">
            <div className="w-full h-full rounded-lg overflow-hidden bg-white shadow-sm border border-gray-100">
              <ChatSection toggleSettings={toggleSettings} />
            </div>
          </div>
        </div>
        
        {/* Settings sidebar with improved transition */}
        <div 
          className={`w-80 border-l border-gray-200 bg-white transition-all duration-300 ease-in-out ${
            showSettings ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          }`}
          style={{
            position: showSettings ? 'relative' : 'absolute',
            right: 0,
            height: '100%',
          }}
        >
          {showSettings && <LLMSettingsPanel onClose={toggleSettings} />}
        </div>
      </div>
    </AgentPageLayout>
  );
};

export default AgentEnvironment;
