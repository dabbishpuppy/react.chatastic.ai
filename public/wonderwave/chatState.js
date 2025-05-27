
import { log, logError, defaultConfig } from './utils.js';
import { getColorSettings } from './settings.js';
import { getBubbleButton } from './ui.js';

// Track chat state
let chatOpen = false;
let iframe = null;
let messageHandler = null;

/**
 * Get chat state
 */
export function isOpen() {
  return chatOpen;
}

/**
 * Get the iframe element
 */
export function getIframe() {
  return iframe;
}

/**
 * Set the iframe element and message handler
 */
export function setIframeAndHandler(newIframe, newMessageHandler) {
  iframe = newIframe;
  messageHandler = newMessageHandler;
}

/**
 * Set chat open state
 */
export function setChatOpen(isOpen) {
  chatOpen = isOpen;
}

/**
 * Update bubble button appearance for open state
 */
export function updateBubbleForOpenState() {
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
      bubbleColor = '#000000'; // Default to black
    }
    
    // Remove any background image and set bubble color
    bubbleButton.style.backgroundImage = 'none';
    bubbleButton.style.backgroundColor = bubbleColor;
    bubbleButton.style.color = '#FFFFFF';
    bubbleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  }
}

/**
 * Update bubble button appearance for closed state
 */
export function updateBubbleForClosedState() {
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
      // Default icon with bubble color - use the correct chat icon
      bubbleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
      bubbleButton.style.backgroundImage = 'none';
      
      // Determine bubble color for default icon
      let bubbleColor;
      if (colorSettings && colorSettings.bubble_color) {
        bubbleColor = colorSettings.bubble_color;
      } else if (config.bubbleColor) {
        bubbleColor = config.bubbleColor;
      } else {
        bubbleColor = '#000000'; // Default to black
      }
      bubbleButton.style.backgroundColor = bubbleColor;
      bubbleButton.style.color = '#FFFFFF';
    }
  }
}

/**
 * Clean up chat resources
 */
export function cleanup() {
  // Remove event listeners
  if (messageHandler) {
    window.removeEventListener('message', messageHandler);
    messageHandler = null;
  }
  
  // Remove the iframe container
  const container = document.getElementById('wonderwave-container');
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
  
  // Reset state
  iframe = null;
  chatOpen = false;
}
