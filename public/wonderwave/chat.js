import { log, logError, defaultConfig } from './utils.js';
import { getColorSettings, isAgentPrivate } from './settings.js';
import { getBubbleButton } from './ui.js';

// Reference to iframe
let iframe = null;
let isOpen = false; // Track chat state

/**
 * Create and open the chat iframe
 */
export function createChatIframe(config) {
  if (iframe || isAgentPrivate()) return;
  
  // Create chat container
  const container = document.createElement('div');
  container.id = 'wonderwave-container';
  
  // Apply container styles
  Object.assign(container.style, {
    position: 'fixed',
    bottom: '90px',
    [config.position]: '20px',
    width: '380px',
    height: '500px',
    maxHeight: 'calc(100vh - 120px)',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    opacity: '0',
    transform: 'translateY(20px)',
    zIndex: config.zIndex - 1,
    display: 'flex',
    flexDirection: 'column'
  });
  
  // Create iframe
  iframe = document.createElement('iframe');
  
  // Build URL with parameters
  let iframeSrc = `https://${config.cdnDomain}/embed/${config.agentId}`;
  
  // Append identity hash params if they exist
  if (config.identityHash && config.userId) {
    iframeSrc += `?identityHash=${encodeURIComponent(config.identityHash)}&userId=${encodeURIComponent(config.userId)}`;
  }
  
  // Append theme and color parameters 
  if (config.theme || config.userMessageColor || config.headerColor) {
    const separator = iframeSrc.includes('?') ? '&' : '?';
    let params = [];
    
    if (config.theme) params.push(`theme=${encodeURIComponent(config.theme)}`);
    if (config.userMessageColor) params.push(`userColor=${encodeURIComponent(config.userMessageColor)}`);
    if (config.headerColor) params.push(`headerColor=${encodeURIComponent(config.headerColor)}`);
    
    iframeSrc += separator + params.join('&');
  }
  
  // Apply iframe styles
  Object.assign(iframe.style, {
    border: 'none',
    width: '100%',
    height: '100%',
    borderRadius: '12px',
    backgroundColor: '#FFFFFF'
  });
  
  iframe.src = iframeSrc;
  iframe.title = 'Chat';
  iframe.id = 'wonderwave-iframe';
  
  // Set iframe attributes
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('allow', 'microphone');
  
  // Add resize listener for responsive design
  container.appendChild(iframe);
  document.body.appendChild(container);
  
  // Add event listener for iframe messages
  window.addEventListener('message', handleIframeMessage);
  
  // Animate in
  setTimeout(() => {
    container.style.opacity = '1';
    container.style.transform = 'translateY(0)';
  }, 10);
}

/**
 * Handle messages from the iframe
 */
export function handleIframeMessage(event) {
  // Make sure the message is from our iframe
  if (!iframe || event.source !== iframe.contentWindow) return;
  
  // Handle different message types
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'resize-iframe':
        // Handle dynamic height adjustments
        // This is optional - for iframe height auto-adjusting
        if (event.data.height && event.data.agentId === window.wonderwaveConfig.agentId) {
          const container = document.getElementById('wonderwave-container');
          if (container) {
            container.style.height = `${event.data.height}px`;
          }
        }
        break;
        
      case 'close-widget':
        // Handle close button click inside iframe
        closeChat();
        break;
    }
  }
}

/**
 * Open the chat widget only if the agent is public
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
  
  log('Opening chat');
  isOpen = true;
  
  // Clear any popups when opening chat
  const popupsContainer = document.getElementById('wonderwave-popups');
  if (popupsContainer) {
    document.body.removeChild(popupsContainer);
  }
  
  // Create iframe if it doesn't exist
  if (!iframe) {
    const config = { ...defaultConfig, ...(window.wonderwaveConfig || {}) };
    createChatIframe(config);
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
  const bubbleButton = getBubbleButton();
  if (bubbleButton) {
    const config = { ...defaultConfig, ...(window.wonderwaveConfig || {}) };
    const colorSettings = getColorSettings();
    
    // Always show bubble color with X icon when open, regardless of chat icon
    let bubbleColor;
    if (colorSettings && colorSettings.bubble_color) {
      bubbleColor = colorSettings.bubble_color;
    } else if (config.bubbleColor) {
      bubbleColor = config.bubbleColor;
    } else {
      bubbleColor = defaultConfig.bubbleColor;
    }
    
    // Remove any background image and set bubble color
    bubbleButton.style.backgroundImage = 'none';
    bubbleButton.style.backgroundColor = bubbleColor;
    bubbleButton.style.color = '#FFFFFF';
    bubbleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  }
}

/**
 * Close the chat widget
 */
export function closeChat() {
  log('Closing chat');
  isOpen = false;
  
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
  const bubbleButton = getBubbleButton();
  if (bubbleButton) {
    const config = { ...defaultConfig, ...(window.wonderwaveConfig || {}) };
    const colorSettings = getColorSettings();
    
    // Use custom chat icon if specified in config or settings, otherwise use default with bubble color
    if (colorSettings && colorSettings.chat_icon) {
      bubbleButton.innerHTML = '';
      bubbleButton.style.backgroundImage = `url("${colorSettings.chat_icon}")`;
      bubbleButton.style.backgroundSize = 'cover';
      bubbleButton.style.backgroundPosition = 'center';
      bubbleButton.style.backgroundColor = 'transparent';
    } else if (config.chatIcon) {
      bubbleButton.innerHTML = '';
      bubbleButton.style.backgroundImage = `url("${config.chatIcon}")`;
      bubbleButton.style.backgroundSize = 'cover';
      bubbleButton.style.backgroundPosition = 'center';
      bubbleButton.style.backgroundColor = 'transparent';
    } else {
      // Default icon with bubble color
      bubbleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;
      bubbleButton.style.backgroundImage = 'none';
      
      // Determine bubble color for default icon
      let bubbleColor;
      if (colorSettings && colorSettings.bubble_color) {
        bubbleColor = colorSettings.bubble_color;
      } else if (config.bubbleColor) {
        bubbleColor = config.bubbleColor;
      } else {
        bubbleColor = defaultConfig.bubbleColor;
      }
      bubbleButton.style.backgroundColor = bubbleColor;
      bubbleButton.style.color = '#FFFFFF';
    }
  }
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
  
  // Remove the iframe container
  const container = document.getElementById('wonderwave-container');
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
    iframe = null;
  }
  
  // Remove any popup containers
  const popupsContainer = document.getElementById('wonderwave-popups');
  if (popupsContainer && popupsContainer.parentNode) {
    popupsContainer.parentNode.removeChild(popupsContainer);
  }
  
  // Remove event listeners
  window.removeEventListener('message', handleIframeMessage);
  
  log('Widget destroyed');
}

/**
 * Get the iframe element
 */
export function getIframe() {
  return iframe;
}

/**
 * Set the iframe element
 */
export function setIframe(newIframe) {
  iframe = newIframe;
}

/**
 * Get chat state
 */
export function isOpen() {
  return isOpen;
}
