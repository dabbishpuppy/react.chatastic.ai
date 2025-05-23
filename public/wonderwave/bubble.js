
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
    [config.position || 'right']: '20px',
    width: config.bubbleSize || '60px',
    height: config.bubbleSize || '60px',
    borderRadius: '50%',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    cursor: 'pointer',
    zIndex: config.zIndex || '9999',
    display: isAgentPrivate() ? 'none' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    overflow: 'hidden',
  });

  log(`Bubble created with position: ${config.position || 'right'}, visibility: ${isAgentPrivate() ? 'hidden' : 'visible'}`);

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
      log('Bubble clicked, toggling chat');
      // Import dynamically to avoid circular dependencies
      import('./chat.js').then(({ toggleChat }) => {
        toggleChat();
      });
    }
  };
  
  // Append to the document
  document.body.appendChild(bubbleButton);
  log('Bubble button created and added to DOM');

  // Return for chaining
  return bubbleButton;
}

/**
 * Update the bubble content (icon or default chat icon)
 */
export function updateBubbleContent(config) {
  if (!bubbleButton) {
    log('No bubble button found to update content');
    return;
  }
  
  const colorSettings = getColorSettings();
  log('Updating bubble content with settings:', colorSettings);
  
  // Use custom chat icon if specified in config or settings, otherwise use default
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
    // For default icon, remove background image and add SVG
    bubbleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;
    bubbleButton.style.backgroundImage = 'none';
    
    // Determine bubble color for default icon
    let bubbleColor;
    if (colorSettings && colorSettings.bubble_color) {
      bubbleColor = colorSettings.bubble_color;
      log('Using bubble color from settings:', bubbleColor);
    } else if (config && config.bubbleColor) {
      bubbleColor = config.bubbleColor;
      log('Using bubble color from config:', bubbleColor);
    } else {
      bubbleColor = defaultConfig.bubbleColor || '#3B82F6';
      log('Using default bubble color:', bubbleColor);
    }
    bubbleButton.style.backgroundColor = bubbleColor;
    bubbleButton.style.color = '#FFFFFF';
  }
}

/**
 * Update the bubble appearance with new settings
 */
export function updateBubbleAppearance() {
  const existingBubble = document.getElementById('wonderwave-bubble');
  const colorSettings = getColorSettings();
  const config = window.wonderwaveConfig || defaultConfig;
  
  if (!existingBubble) {
    log('No bubble found to update appearance, creating one');
    return createBubbleButton(config);
  }
  
  if (!colorSettings) {
    log('No color settings available for bubble appearance update');
    return;
  }
  
  log('Updating bubble appearance with settings:', colorSettings);
  
  // Update the bubble content
  bubbleButton = existingBubble;
  updateBubbleContent(config);
  
  // Update bubble position if specified
  if (colorSettings.bubble_position) {
    log(`Setting bubble position to ${colorSettings.bubble_position}`);
    // Reset both positions first
    existingBubble.style.left = '';
    existingBubble.style.right = '';
    
    // Set the new position
    existingBubble.style[colorSettings.bubble_position] = '20px';
  }
  
  // If agent is private, hide the bubble
  if (isAgentPrivate()) {
    existingBubble.style.display = 'none';
    log('Agent is private, hiding bubble');
  } else if (existingBubble.style.display === 'none') {
    existingBubble.style.display = 'flex';
    log('Agent is public, showing bubble');
  }
  
  return existingBubble;
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

// Create bubble immediately when imported if config exists
setTimeout(() => {
  if (window.wonderwaveConfig) {
    log('Attempting immediate bubble creation on module import');
    createBubbleButton(window.wonderwaveConfig);
  }
}, 100);
