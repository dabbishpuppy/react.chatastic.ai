
import { useEffect } from "react";

export const useEmbeddedMessageHandler = (
  agentId?: string,
  refreshSettings?: () => void
) => {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('📨 EmbeddedChat received message:', event.data);
      
      if (event.data?.type === 'wonderwave-refresh-settings' || 
          event.data?.type === 'lead-settings-updated') {
        const messageAgentId = event.data.agentId;
        if (messageAgentId === agentId && refreshSettings) {
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
};
