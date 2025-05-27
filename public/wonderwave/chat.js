import { log, logError, defaultConfig } from './utils.js';
import { isAgentPrivate } from './settings.js';
import { doesAgentExist } from './agentVisibility.js';
import { getBubbleButton } from './ui.js';
import { setRateLimitSettings } from './messageHandling.js';
import { createChatIframe, handleIframeMessage as handleIframeMessageFromModule } from './chatIframe.js';
import { 
  isOpen, 
  getIframe, 
  setIframeAndHandler, 
  setChatOpen,
  updateBubbleForOpenState,
  updateBubbleForClosedState,
  cleanup
} from './chatState.js';

// Export rate limit settings function for backward compatibility
export { setRateLimitSettings };

// Export createChatIframe from chatIframe.js for use in index.js
export { createChatIframe, handleIframeMessage as handleIframeMessageFromModule };

/**
 * Open the chat widget only if the agent is public and exists
 */
export function openChat() {
  if (!window.wonderwaveConfig) {
    logError('Chat not initialized. Call init() first.');
    return;
  }
  
  if (isAgentPrivate()) {
    logError('Cannot open chat. Agent is private.');
    return;
  }
  
  if (!doesAgentExist()) {
    logError('Cannot open chat. Agent does not exist.');
    return;
  }
  
  log('Opening chat');
  setChatOpen(true);
  
  // Clear any popups when opening chat
  const popupsContainer = document.getElementById('wonderwave-popups');
  if (popupsContainer) {
    document.body.removeChild(popupsContainer);
  }
  
  // Create iframe if it doesn't exist
  let iframe = getIframe();
  if (!iframe) {
    const config = { ...defaultConfig, ...(window.wonderwaveConfig || {}) };
    const result = createChatIframe(config, isOpen(), closeChat);
    if (result) {
      setIframeAndHandler(result.iframe, result.messageHandler);
    }
  } else {
    // Show existing iframe
    const container = document.getElementById('wonderwave-container');
    if (container) {
      container.style.display = 'flex';
      setTimeout(() => {
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
      }, 10);
    }
  }
  
  // Update bubble button with close icon and bubble color background
  updateBubbleForOpenState();
}

/**
 * Close the chat widget
 */
export function closeChat() {
  log('Closing chat');
  setChatOpen(false);
  
  const container = document.getElementById('wonderwave-container');
  if (container) {
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    
    // Hide after animation completes
    setTimeout(() => {
      container.style.display = 'none';
    }, 300);
  }
  
  // Restore proper icon on the button based on chat icon availability
  updateBubbleForClosedState();
}

/**
 * Toggle the chat widget
 */
export function toggleChat() {
  log('Toggling chat');
  
  const container = document.getElementById('wonderwave-container');
  if (container && container.style.display !== 'none' && container.style.opacity !== '0') {
    closeChat();
  } else {
    openChat();
  }
}

/**
 * Destroy the chat widget
 */
export function destroy() {
  log('Destroying widget');
  
  // Remove the bubble button
  const bubbleButton = getBubbleButton();
  if (bubbleButton && bubbleButton.parentNode) {
    bubbleButton.parentNode.removeChild(bubbleButton);
  }
  
  // Remove any popup containers
  const popupsContainer = document.getElementById('wonderwave-popups');
  if (popupsContainer && popupsContainer.parentNode) {
    popupsContainer.parentNode.removeChild(popupsContainer);
  }
  
  // Clean up chat resources
  cleanup();
  
  log('Widget destroyed');
}

/**
 * Get the iframe element - exported for backward compatibility
 */
export { getIframe };

/**
 * Set the iframe element - exported for backward compatibility
 */
export function setIframe(newIframe) {
  setIframeAndHandler(newIframe, null);
}

/**
 * Get chat state - exported for backward compatibility
 */
export { isOpen };
