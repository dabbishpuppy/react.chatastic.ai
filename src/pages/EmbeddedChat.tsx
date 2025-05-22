
import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useChatSettings } from "@/hooks/useChatSettings";
import ChatSection from "@/components/agent/ChatSection";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";

const EmbeddedChat: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams] = useSearchParams();
  const { settings, isLoading } = useChatSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const [agentVisibility, setAgentVisibility] = useState<string | null>(null);
  const [visibilityLoading, setVisibilityLoading] = useState(true);
  
  // Get URL parameters for theme and colors if present
  const themeParam = searchParams.get('theme');
  const userColorParam = searchParams.get('userColor');
  const headerColorParam = searchParams.get('headerColor');

  // Use URL parameters if provided, otherwise use settings from database
  const theme = themeParam || settings?.theme;
  const userMessageColor = userColorParam || settings?.user_message_color;
  
  // For header color:
  // 1. Use headerColorParam if provided in URL
  // 2. If not in URL but sync is enabled, use user message color
  // 3. Otherwise, use null to get default white header
  const headerColor = headerColorParam || 
    (settings?.sync_colors ? settings?.user_message_color : null);
  
  // Fetch agent visibility when the component mounts
  useEffect(() => {
    const fetchAgentVisibility = async () => {
      if (!agentId) return;
      
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('visibility')
          .eq('id', agentId)
          .single();
          
        if (error) {
          console.error("Error fetching agent visibility:", error);
          return;
        }
        
        if (data) {
          setAgentVisibility(data.visibility);
        }
      } catch (error) {
        console.error("Error in fetchAgentVisibility:", error);
      } finally {
        setVisibilityLoading(false);
      }
    };
    
    fetchAgentVisibility();
  }, [agentId]);
  
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
      const resizeObserver = new ResizeObserver(() => {
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
    
    // Listen for chat events that might change height
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'message-sent') {
        setTimeout(sendHeightToParent, 100);
      }
    });
    
    return () => {
      clearInterval(interval);
    };
  }, [agentId]);

  if (isLoading || visibilityLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If agent is private, show an error message
  if (agentVisibility === "private") {
    return (
      <div className="w-full h-screen flex items-center justify-center p-4 bg-white">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">This Agent is Private</h2>
          <p className="text-gray-600">
            The owner of this agent has set it to private mode. 
            It cannot be accessed or embedded on external websites.
          </p>
        </div>
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
          theme={theme as 'light' | 'dark' | 'system'}
          profilePicture={settings.profile_picture || undefined}
          footer={settings.footer || undefined}
          isEmbedded={true}
          userMessageColor={userMessageColor}
          headerColor={headerColor}
          hideUserAvatar={true} // Always hide user avatar in embedded chat
        />
      </ScrollArea>
    </div>
  );
};

export default EmbeddedChat;
