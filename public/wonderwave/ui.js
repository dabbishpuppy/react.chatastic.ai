
import { log, logError, defaultConfig } from './utils.js';
import { getColorSettings, isAgentPrivate } from './settings.js';
import { toggleChat } from './chat.js';

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
  
  const colorSettings = getColorSettings();
  
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
      toggleChat();
    }
  };
  
  // Append to the document
  document.body.appendChild(bubbleButton);
  log('Bubble button created and added to DOM');
}

/**
 * Update the bubble content (icon or default chat icon)
 */
function updateBubbleContent(config) {
  if (!bubbleButton) return;
  
  const colorSettings = getColorSettings();
  
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
    } else if (config.bubbleColor) {
      bubbleColor = config.bubbleColor;
    } else {
      bubbleColor = defaultConfig.bubbleColor;
    }
    bubbleButton.style.backgroundColor = bubbleColor;
    bubbleButton.style.color = '#FFFFFF';
  }
}

/**
 * Show initial message popups
 */
export function showPopups(config) {
  // Don't show popups if chat is already open
  const iframe = document.getElementById('wonderwave-iframe');
  if (iframe && document.getElementById('wonderwave-container').style.display !== 'none') {
    return;
  }
  
  // Create popups container if it doesn't exist
  let popupsContainer = document.getElementById('wonderwave-popups');
  if (!popupsContainer) {
    popupsContainer = document.createElement('div');
    popupsContainer.id = 'wonderwave-popups';
    
    // Position relative to the bubble
    Object.assign(popupsContainer.style, {
      position: 'fixed',
      bottom: '90px',
      [config.position]: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      alignItems: config.position === 'right' ? 'flex-end' : 'flex-start',
      zIndex: config.zIndex - 1,
    });
    
    document.body.appendChild(popupsContainer);
  }
  
  const colorSettings = getColorSettings();
  
  // Get initial messages to show
  const initialMessage = colorSettings?.initial_message || config.initialMessage || '👋 Hi! How can I help you today?';
  const messages = initialMessage.split('\n').filter(Boolean);
  
  // Show the first message
  showPopupMessage(messages[0], 0, config, popupsContainer);
  
  // Schedule additional messages if available
  if (messages.length > 1) {
    for (let i = 1; i < messages.length; i++) {
      setTimeout(() => {
        showPopupMessage(messages[i], i, config, popupsContainer);
      }, i * 2000);
    }
  }
}

/**
 * Show a single popup message
 */
function showPopupMessage(message, index, config, container) {
  const popup = document.createElement('div');
  
  // Style the popup
  Object.assign(popup.style, {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    borderRadius: '12px',
    padding: '12px',
    maxWidth: '280px',
    opacity: '0',
    transform: 'translateY(10px)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    marginBottom: '8px',
    marginRight: config.position === 'right' ? '0' : 'auto',
    marginLeft: config.position === 'left' ? '0' : 'auto',
  });
  
  // Add message with optional profile picture
  if (config.profilePicture) {
    popup.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 8px;">
        <div style="width: 24px; height: 24px; border-radius: 50%; overflow: hidden; flex-shrink: 0;">
          <img src="${config.profilePicture}" alt="Agent" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
        <div>${message}</div>
      </div>
    `;
  } else {
    popup.innerHTML = `<div>${message}</div>`;
  }
  
  // Add to DOM
  container.appendChild(popup);
  
  // Animate in
  setTimeout(() => {
    popup.style.opacity = '1';
    popup.style.transform = 'translateY(0)';
  }, 10);
  
  // Auto dismiss after a while
  setTimeout(() => {
    popup.style.opacity = '0';
    popup.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
      if (container.contains(popup)) {
        container.removeChild(popup);
      }
      
      // Remove container if empty
      if (container.children.length === 0) {
        document.body.removeChild(container);
      }
    }, 300);
  }, 8000); // Show for 8 seconds
  
  // Click to dismiss
  popup.onclick = function() {
    popup.style.opacity = '0';
    popup.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
      if (container.contains(popup)) {
        container.removeChild(popup);
      }
    }, 300);
  };
}

/**
 * Update the bubble appearance with new settings
 */
export function updateBubbleAppearance() {
  const bubbleButton = document.getElementById('wonderwave-bubble');
  const colorSettings = getColorSettings();
  const config = window.wonderwaveConfig || defaultConfig;
  
  if (!bubbleButton || !colorSettings) return;
  
  // Update the bubble content
  updateBubbleContent(config);
  
  // Update bubble position if specified
  if (colorSettings.bubble_position) {
    // Reset both positions first
    bubbleButton.style.left = '';
    bubbleButton.style.right = '';
    
    // Set the new position
    bubbleButton.style[colorSettings.bubble_position] = '20px';
  }
  
  // If agent is private, hide the bubble
  if (isAgentPrivate()) {
    bubbleButton.style.display = 'none';
  } else if (bubbleButton.style.display === 'none') {
    bubbleButton.style.display = 'flex';
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
