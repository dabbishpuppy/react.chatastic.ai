
import React, { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useChatSettings } from "@/hooks/useChatSettings";
import ChatSection from "@/components/agent/ChatSection";
import { ScrollArea } from "@/components/ui/scroll-area";

const EmbeddedChat: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { settings, isLoading } = useChatSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  
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

  // Set up ResizeObserver to watch for size changes and communicate with parent
  useEffect(() => {
    // Only run this in an iframe context
    if (window.self === window.top) return;
    
    const sendHeightToParent = () => {
      if (containerRef.current) {
        const height = containerRef.current.scrollHeight;
        // Send message to parent with new height
        window.parent.postMessage({ 
          type: 'resize-iframe', 
          height: height,
          agentId: agentId 
        }, '*');
      }
    };
    
    // Create a ResizeObserver to detect content changes
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver((entries) => {
        sendHeightToParent();
      });
      
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
      
      // Also observe the body element for any changes
      resizeObserver.observe(document.body);
      
      return () => {
        if (containerRef.current) {
          resizeObserver.unobserve(containerRef.current);
        }
        resizeObserver.unobserve(document.body);
        resizeObserver.disconnect();
      };
    }
    
    // Fallback for browsers without ResizeObserver
    const interval = setInterval(sendHeightToParent, 500);
    
    // Send initial height after render
    setTimeout(sendHeightToParent, 100);
    
    // Send height on chat updates
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'message-sent') {
        setTimeout(sendHeightToParent, 100);
      }
    });
    
    return () => {
      clearInterval(interval);
    };
  }, [agentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Use the chat settings from the agent but don't pass the chat icon
  return (
    <div className="w-full h-screen flex flex-col overflow-hidden" ref={containerRef}>
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
