
import { useEffect } from "react";

export const useChatSectionEffects = (
  isEmbedded: boolean,
  agentId: string | undefined,
  propLeadSettings: any,
  refreshSettings: () => void,
  effectiveLeadSettings: any,
  hasShownLeadForm: boolean,
  userHasMessaged: boolean,
  chatHistory: any[],
  isTyping: boolean,
  setChatHistory: (update: (prev: any[]) => any[]) => void,
  setHasShownLeadForm: (value: boolean) => void,
  scrollToBottom: () => void,
  currentConversation: any,
  setDisplayMessages: (messages: any[]) => void,
  initialMessages: any[],
  cleanup: () => void
) => {
  // Enhanced refresh logic for embedded mode with immediate updates
  useEffect(() => {
    if (isEmbedded && agentId) {
      console.log('🔄 Setting up enhanced settings refresh for embedded mode');
      
      // If using hook (fallback), refresh it
      if (!propLeadSettings) {
        refreshSettings();
        
        // Faster refresh interval for embedded mode (1 second instead of 2)
        const interval = setInterval(() => {
          console.log('⏰ Periodic settings refresh for embedded mode');
          refreshSettings();
        }, 1000);
        
        // Listen for settings update messages with immediate response
        const handleMessage = (event: MessageEvent) => {
          console.log('📨 Received message in ChatSection:', event.data);
          
          if (event.data && (
            event.data.type === 'lead-settings-updated' || 
            event.data.type === 'wonderwave-refresh-settings'
          ) && event.data.agentId === agentId) {
            console.log('📋 Received lead settings update message, triggering immediate refresh...');
            
            // Multiple immediate refreshes to ensure update
            refreshSettings();
            setTimeout(() => refreshSettings(), 100);
            setTimeout(() => refreshSettings(), 500);
            setTimeout(() => refreshSettings(), 1000);
          }
        };
        
        window.addEventListener('message', handleMessage);
        
        return () => {
          clearInterval(interval);
          window.removeEventListener('message', handleMessage);
        };
      }
    }
  }, [isEmbedded, agentId, refreshSettings, propLeadSettings]);

  // Enhanced debug logging for lead form
  useEffect(() => {
    console.log('🔍 LEAD FORM DEBUG STATE:', {
      agentId,
      isEmbedded,
      leadSettingsLoaded: !!effectiveLeadSettings,
      leadSettingsEnabled: effectiveLeadSettings?.enabled,
      collectName: effectiveLeadSettings?.collect_name,
      collectEmail: effectiveLeadSettings?.collect_email,
      collectPhone: effectiveLeadSettings?.collect_phone,
      hasShownLeadForm,
      userHasMessaged,
      chatHistoryLength: chatHistory.length,
      isTyping,
      title: effectiveLeadSettings?.title,
      leadSettingsObject: effectiveLeadSettings
    });
  }, [agentId, isEmbedded, effectiveLeadSettings, hasShownLeadForm, userHasMessaged, chatHistory.length, isTyping]);

  // Enhanced lead form trigger logic
  useEffect(() => {
    if (!isEmbedded || !effectiveLeadSettings?.enabled || hasShownLeadForm || !userHasMessaged || isTyping) {
      return;
    }

    // Check if at least one field is enabled
    const hasAnyFields = effectiveLeadSettings.collect_name || effectiveLeadSettings.collect_email || effectiveLeadSettings.collect_phone;
    if (!hasAnyFields) {
      console.log('🚫 No lead form fields enabled, skipping form display');
      return;
    }

    // Count user messages and AI responses
    const userMessages = chatHistory.filter(msg => !msg.isAgent && msg.content !== "LEAD_FORM_WIDGET");
    const aiMessages = chatHistory.filter(msg => msg.isAgent && msg.content !== "LEAD_FORM_WIDGET");
    
    console.log('🚀 LEAD FORM TRIGGER CHECK:', {
      userMessagesCount: userMessages.length,
      aiMessagesCount: aiMessages.length,
      shouldTrigger: userMessages.length >= 1 && aiMessages.length >= 1,
      hasAnyFields,
      enabledFields: {
        name: effectiveLeadSettings.collect_name,
        email: effectiveLeadSettings.collect_email,
        phone: effectiveLeadSettings.collect_phone
      }
    });

    // Show lead form after first user message AND first AI response
    if (userMessages.length >= 1 && aiMessages.length >= 1) {
      console.log('✅ TRIGGERING LEAD FORM NOW - Adding to chat');
      const timer = setTimeout(() => {
        // Add lead form message to chat history instead of showing popup
        const leadFormMessage = {
          isAgent: true,
          content: "LEAD_FORM_WIDGET",
          timestamp: new Date().toISOString()
        };
        
        setChatHistory(prev => {
          const newHistory = [...prev, leadFormMessage];
          
          // Trigger enhanced scroll after lead form is added
          setTimeout(() => {
            scrollToBottom();
          }, 100);
          
          return newHistory;
        });
        setHasShownLeadForm(true);
        console.log('📋 LEAD FORM ADDED TO CHAT');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isEmbedded, effectiveLeadSettings?.enabled, effectiveLeadSettings?.collect_name, effectiveLeadSettings?.collect_email, effectiveLeadSettings?.collect_phone, effectiveLeadSettings?.title, hasShownLeadForm, userHasMessaged, chatHistory, isTyping, setChatHistory, scrollToBottom]);

  // Update chat when initialMessages prop changes
  useEffect(() => {
    if (initialMessages.length > 0 && !currentConversation) {
      setDisplayMessages(initialMessages);
      setChatHistory(() => initialMessages);
    }
  }, [initialMessages, currentConversation, setChatHistory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);
};
