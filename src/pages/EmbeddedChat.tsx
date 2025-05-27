
import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useChatSettings } from "@/hooks/useChatSettings";
import ChatSection from "@/components/agent/ChatSection";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";

const EmbeddedChat: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams] = useSearchParams();
  const { settings, leadSettings, isLoading, refreshSettings } = useChatSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const [agentVisibility, setAgentVisibility] = useState<string | null>(null);
  const [visibilityLoading, setVisibilityLoading] = useState(true);
  
  console.log('🎯 EmbeddedChat - agentId from params:', agentId);
  console.log('📋 EmbeddedChat - leadSettings:', leadSettings);
  
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
  
  // Listen for settings refresh messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('📨 EmbeddedChat received message:', event.data);
      
      if (event.data?.type === 'wonderwave-refresh-settings' || 
          event.data?.type === 'lead-settings-updated') {
        const messageAgentId = event.data.agentId;
        if (messageAgentId === agentId) {
          console.log('🔄 Refreshing settings due to external update');
          refreshSettings();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [agentId, refreshSettings]);
  
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
  
  // Enhanced styles for proper scrolling and sizing in embedded mode
  useEffect(() => {
    // Add enhanced styles to ensure proper scrolling behavior and sizing
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        overflow: auto !important;
        position: relative !important;
        width: 100%;
        height: 100vh;
        margin: 0;
        padding: 0;
      }
      
      /* Enhanced embedded chat container with better sizing */
      .embedded-chat-container {
        height: 100vh;
        width: 100vw;
        max-width: 500px;
        min-width: 400px;
        margin: 0 auto;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
        display: flex;
        flex-direction: column;
      }

      /* Fix ScrollArea overflow issues with enhanced visibility */
      [data-radix-scroll-area-viewport] {
        overflow-y: auto !important;
        overflow-x: hidden !important;
        scroll-behavior: smooth !important;
      }
      
      /* Enhanced scrollbars for better visibility */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      
      ::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
      }
      
      ::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 10px;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: #555;
      }

      /* Responsive sizing for mobile */
      @media (max-width: 480px) {
        .embedded-chat-container {
          min-width: 100vw;
          max-width: 100vw;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
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
    <div className="embedded-chat-container" ref={containerRef}>
      <div className="w-full h-full flex flex-col">
        <ChatSection 
          agentId={agentId} // Pass agentId as prop
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
          leadSettings={leadSettings} // Pass lead settings from Edge Function
        />
      </div>
    </div>
  );
};

export default EmbeddedChat;
