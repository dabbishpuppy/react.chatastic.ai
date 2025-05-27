
import { log, logError, defaultConfig } from './utils.js';
import { getColorSettings, isAgentPrivate } from './settings.js';

// Reference to the bubble button
let bubbleButton = null;

/**
 * Create the chat bubble button
 */
export function createBubbleButton(config) {
  // Create the bubble button if it doesn't exist
  if (bubbleButton) {
    log('Bubble button already exists, skipping creation');
    return;
  }
  
  log('Creating bubble button');
  
  bubbleButton = document.createElement('div');
  bubbleButton.id = 'wonderwave-bubble';
  
  // Apply styles
  Object.assign(bubbleButton.style, {
    position: 'fixed',
    bottom: '20px',
    [config.position]: '20px',
    width: config.bubbleSize,
    height: config.bubbleSize,
    borderRadius: '50%',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    cursor: 'pointer',
    zIndex: config.zIndex,
    display: isAgentPrivate() ? 'none' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    overflow: 'hidden',
  });

  // Set the content based on availability of chat icon
  updateBubbleContent(config);
  
  // Add hover effect
  bubbleButton.onmouseenter = function() {
    if (!isAgentPrivate()) {
      this.style.transform = 'scale(1.1)';
      this.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.3)';
    }
  };
  
  bubbleButton.onmouseleave = function() {
    if (!isAgentPrivate()) {
      this.style.transform = 'scale(1)';
      this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    }
  };
  
  // Add click handler
  bubbleButton.onclick = function() {
    if (!isAgentPrivate()) {
      // Import dynamically to avoid circular dependencies
      import('./chat.js').then(({ toggleChat }) => {
        toggleChat();
      });
    }
  };
  
  // Append to the document
  document.body.appendChild(bubbleButton);
  log('Bubble button created and added to DOM');
}

/**
 * Update the bubble content (icon or default chat icon)
 */
export function updateBubbleContent(config) {
  if (!bubbleButton) return;
  
  const colorSettings = getColorSettings();
  
  // Check if chat is currently open by looking at the iframe container
  const container = document.getElementById('wonderwave-container');
  const isOpen = container && container.style.display !== 'none' && container.style.opacity !== '0';
  
  if (isOpen) {
    // When chat is open, always show bubble color with X icon
    let bubbleColor;
    if (colorSettings && colorSettings.bubble_color) {
      bubbleColor = colorSettings.bubble_color;
    } else if (config.bubbleColor) {
      bubbleColor = config.bubbleColor;
    } else {
      bubbleColor = '#000000'; // Default to black instead of blue
    }
    
    bubbleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    bubbleButton.style.backgroundImage = 'none';
    bubbleButton.style.backgroundColor = bubbleColor;
    bubbleButton.style.color = '#FFFFFF';
  } else {
    // When chat is closed, show appropriate icon
    if (colorSettings && colorSettings.chat_icon) {
      log('Using custom chat icon from settings:', colorSettings.chat_icon);
      // For custom icon, use it as full background image
      bubbleButton.innerHTML = '';
      bubbleButton.style.backgroundImage = `url("${colorSettings.chat_icon}")`;
      bubbleButton.style.backgroundSize = 'cover';
      bubbleButton.style.backgroundPosition = 'center';
      bubbleButton.style.backgroundColor = 'transparent';
    } else if (config && config.chatIcon) {
      log('Using custom chat icon from config:', config.chatIcon);
      // For custom icon in config, use it as full background image
      bubbleButton.innerHTML = '';
      bubbleButton.style.backgroundImage = `url("${config.chatIcon}")`;
      bubbleButton.style.backgroundSize = 'cover';
      bubbleButton.style.backgroundPosition = 'center';
      bubbleButton.style.backgroundColor = 'transparent';
    } else {
      log('Using default chat icon');
      // For default icon, remove background image and add SVG with the correct chat icon
      bubbleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
      bubbleButton.style.backgroundImage = 'none';
      
      // Determine bubble color for default icon - use black as default
      let bubbleColor;
      if (colorSettings && colorSettings.bubble_color) {
        bubbleColor = colorSettings.bubble_color;
      } else if (config.bubbleColor) {
        bubbleColor = config.bubbleColor;
      } else {
        bubbleColor = '#000000'; // Default to black instead of blue
      }
      bubbleButton.style.backgroundColor = bubbleColor;
      bubbleButton.style.color = '#FFFFFF';
    }
  }
}

/**
 * Update the bubble appearance with new settings
 */
export function updateBubbleAppearance() {
  const existingBubble = document.getElementById('wonderwave-bubble');
  const colorSettings = getColorSettings();
  const config = window.wonderwaveConfig || { bubbleColor: '#000000' }; // Default to black
  
  if (!existingBubble || !colorSettings) return;
  
  // Update the bubble content
  bubbleButton = existingBubble;
  updateBubbleContent(config);
  
  // Update bubble position if specified
  if (colorSettings.bubble_position) {
    // Reset both positions first
    existingBubble.style.left = '';
    existingBubble.style.right = '';
    
    // Set the new position
    existingBubble.style[colorSettings.bubble_position] = '20px';
  }
  
  // If agent is private, hide the bubble
  if (isAgentPrivate()) {
    existingBubble.style.display = 'none';
  } else if (existingBubble.style.display === 'none') {
    existingBubble.style.display = 'flex';
  }
}

/**
 * Get the bubble button element
 */
export function getBubbleButton() {
  return bubbleButton;
}

/**
 * Set the bubble button element
 */
export function setBubbleButton(button) {
  bubbleButton = button;
}
