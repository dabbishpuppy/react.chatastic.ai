
import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useChatSettings } from "@/hooks/useChatSettings";
import ChatSection from "@/components/agent/ChatSection";
import { ScrollArea } from "@/components/ui/scroll-area";

const EmbeddedChat: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { settings, isLoading } = useChatSettings();
  
  // Add effect to prevent parent page scrolling when interacting with the iframe
  useEffect(() => {
    const preventParentScrolling = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Prevent scrolling of parent window when inside iframe
    document.addEventListener('wheel', preventParentScrolling, { passive: false });
    document.addEventListener('touchmove', preventParentScrolling, { passive: false });
    document.addEventListener('keydown', (e) => {
      // Prevent scrolling with arrow keys, space, etc.
      if ([32, 37, 38, 39, 40].includes(e.keyCode)) {
        e.preventDefault();
      }
    });

    // Add styles to ensure proper focus behavior
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        overflow: hidden;
        position: fixed;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
      }
      
      /* Ensure focus doesn't cause scrolling */
      *:focus {
        outline: none;
      }
      
      /* Hide scrollbars but allow scrolling in contained areas */
      .scroll-container {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      
      .scroll-container::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener('wheel', preventParentScrolling);
      document.removeEventListener('touchmove', preventParentScrolling);
      document.head.removeChild(style);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Use the chat settings from the agent but don't pass the chat icon
  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      <ScrollArea className="w-full h-full overflow-hidden">
        <ChatSection 
          initialMessages={[{
            isAgent: true,
            content: settings.initial_message,
            timestamp: new Date().toISOString()
          }]}
          agentName={settings.display_name}
          placeholder={settings.message_placeholder}
          suggestedMessages={settings.suggested_messages.map(msg => msg.text)}
          showSuggestions={settings.show_suggestions_after_chat}
          showFeedback={settings.show_feedback}
          allowRegenerate={settings.allow_regenerate}
          theme={settings.theme}
          profilePicture={settings.profile_picture || undefined}
          footer={settings.footer || undefined}
          isEmbedded={true}
        />
      </ScrollArea>
    </div>
  );
};

export default EmbeddedChat;
