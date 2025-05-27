
import { ChatInterfaceSettings } from '@/types/chatInterface';
import { loadSettingsFromEdgeFunction } from './edgeFunctionService';

// Function to notify embedded components about settings changes
export const notifySettingsChange = async (settingsToNotify: ChatInterfaceSettings, validAgentId: string | null) => {
  console.log('📢 Notifying settings change to embedded components');
  
  // Create the message payload
  const messagePayload = {
    type: 'wonderwave-refresh-settings',
    agentId: validAgentId,
    settings: settingsToNotify
  };
  
  console.log('📤 Message payload:', messagePayload);
  
  // Send message to all iframes on the page
  const iframes = document.querySelectorAll('iframe[src*="/embed/"]');
  console.log(`📤 Found ${iframes.length} iframes to notify`);
  iframes.forEach((iframe, index) => {
    const iframeElement = iframe as HTMLIFrameElement;
    if (iframeElement.contentWindow) {
      console.log(`📤 Sending settings update to iframe ${index + 1}`);
      try {
        iframeElement.contentWindow.postMessage(messagePayload, '*');
        console.log(`✅ Message sent to iframe ${index + 1}`);
      } catch (error) {
        console.error(`❌ Failed to send message to iframe ${index + 1}:`, error);
      }
    }
  });

  // Send message to parent window (in case this settings page is embedded)
  if (window.parent !== window) {
    console.log('📤 Sending settings update to parent window');
    try {
      window.parent.postMessage(messagePayload, '*');
      console.log('✅ Message sent to parent window');
    } catch (error) {
      console.error('❌ Failed to send message to parent window:', error);
    }
  }

  // Send message to any wonderwave widgets on external sites
  if (window.opener) {
    console.log('📤 Sending settings update to opener window');
    try {
      window.opener.postMessage(messagePayload, '*');
      console.log('✅ Message sent to opener window');
    } catch (error) {
      console.error('❌ Failed to send message to opener window:', error);
    }
  }
  
  // Also trigger a refresh of the edge function to update cache
  if (validAgentId) {
    console.log('🔄 Triggering edge function cache refresh');
    loadSettingsFromEdgeFunction(validAgentId, true).then(() => {
      console.log('✅ Edge function cache refreshed');
    }).catch(error => {
      console.error('❌ Failed to refresh edge function cache:', error);
    });
  }
};
