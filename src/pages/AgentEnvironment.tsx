
import React, { useState } from "react";
import AgentPageLayout from "./AgentPageLayout";
import ChatSection from "@/components/agent/ChatSection";
import LLMSettingsPanel from "@/components/agent/LLMSettingsPanel";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useChatSettings } from "@/hooks/useChatSettings";

const AgentEnvironment: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const { settings, isLoading } = useChatSettings();

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
            {isLoading ? (
              <div className="w-full h-full flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <div className="w-full h-full rounded-lg overflow-hidden bg-white shadow-sm border border-gray-100">
                <ChatSection 
                  toggleSettings={toggleSettings} 
                  agentName={settings.display_name}
                  placeholder={settings.message_placeholder}
                  suggestedMessages={settings.suggested_messages.map(msg => msg.text)}
                  showSuggestions={settings.show_suggestions_after_chat}
                  showFeedback={settings.show_feedback}
                  allowRegenerate={settings.allow_regenerate}
                  theme={settings.theme}
                  profilePicture={settings.profile_picture || undefined}
                  initialMessages={[
                    {
                      isAgent: true,
                      content: settings.initial_message,
                      timestamp: new Date().toISOString()
                    }
                  ]}
                  footer={settings.footer || undefined}
                  // chatIcon prop removed as requested
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Settings sidebar - only visible when showSettings is true */}
        {showSettings && (
          <div className="w-80 border-l border-gray-200 bg-white">
            <LLMSettingsPanel onClose={toggleSettings} />
          </div>
        )}
      </div>
    </AgentPageLayout>
  );
};

export default AgentEnvironment;
