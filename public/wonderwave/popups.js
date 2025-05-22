
import { log, defaultConfig } from './utils.js';
import { getColorSettings, isAgentPrivate } from './settings.js';

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
