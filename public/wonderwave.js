
/**
 * WonderWave Chat Widget v1.3
 * A lightweight embeddable chat widget for any website
 */
(function() {
  'use strict';

  // Keep track of initialization state
  let initialized = false;
  let iframe = null;
  let bubbleButton = null;
  let debugMode = false;
  let colorSettings = null;
  let isPrivate = false;
  
  // Default configuration
  const defaultConfig = {
    position: 'right',
    bubbleColor: '#3B82F6', // Blue
    bubbleSize: '60px',
    zIndex: 999999,
    cdnDomain: 'query-spark-start.lovable.app',
  };

  // Store for queued commands before initialization
  let commandQueue = [];
  
  // Simple logging function that only logs when debug mode is enabled
  function log(...args) {
    if (debugMode || (window.wonderwaveConfig && window.wonderwaveConfig.debug)) {
      console.log('[WonderWave]', ...args);
    }
  }

  // Log errors always to help with debugging
  function logError(...args) {
    console.error('[WonderWave Error]', ...args);
  }
  
  // Process any commands that were queued before script loaded
  function processQueue() {
    const queue = window.wonderwave.q || [];
    log('Processing command queue, length:', queue.length);
    
    while (queue.length > 0) {
      const args = queue.shift();
      if (args && args.length > 0) {
        const command = args[0];
        const params = args.slice(1);
        handleCommand(command, params);
      }
    }
  }
  
  // Handle various commands
  function handleCommand(command, params) {
    log('Handling command:', command, params);
    
    switch (command) {
      case 'init':
        init(params[0]);
        return 'initialized';
      case 'open':
        openChat();
        return 'opened';
      case 'close':
        closeChat();
        return 'closed';
      case 'toggle':
        toggleChat();
        return 'toggled';
      case 'destroy':
        destroy();
        return 'destroyed';
      case 'debug':
        debugMode = params[0] === true;
        log('Debug mode set to:', debugMode);
        return debugMode;
      case 'getState':
        return initialized ? 'initialized' : 'not-initialized';
      case 'refreshSettings':
        fetchColorSettingsAndVisibility(window.wonderwaveConfig.agentId);
        return 'refreshing';
      default:
        logError(`Unknown command "${command}"`);
        return 'error-unknown-command';
    }
  }
  
  // Fetch color settings and agent visibility from the backend
  async function fetchColorSettingsAndVisibility(agentId) {
    if (!agentId) {
      log('No agentId provided for fetching settings');
      return null;
    }
    
    try {
      log(`Fetching settings for agent ${agentId}`);
      
      // First, check agent visibility with better error handling
      try {
        const visibilityResponse = await fetch(`https://${defaultConfig.cdnDomain}/api/agent-visibility/${agentId}`);
        
        if (!visibilityResponse.ok) {
          log(`Agent visibility check returned status: ${visibilityResponse.status}`);
          // Don't throw, continue with public visibility as fallback
        } else {
          const visibilityData = await visibilityResponse.json();
          log('Fetched visibility data:', visibilityData);
          
          // Update the private flag
          if (visibilityData?.visibility === 'private') {
            isPrivate = true;
            
            // If private, hide the chat bubble if it exists
            if (bubbleButton) {
              bubbleButton.style.display = 'none';
            }
            
            // If the chat is already open, close it
            if (iframe) {
              closeChat();
            }
            
            // Don't fetch color settings if agent is private
            return null;
          } else {
            isPrivate = false;
            
            // If agent is now public (was private before), show the bubble
            if (bubbleButton) {
              bubbleButton.style.display = 'flex';
            }
          }
        }
      } catch (visibilityError) {
        logError('Error fetching visibility, defaulting to public:', visibilityError);
        // Default to public if the visibility check fails
        isPrivate = false;
      }
      
      // Now fetch color settings since agent is public or visibility check failed
      try {
        const response = await fetch(`https://${defaultConfig.cdnDomain}/api/chat-settings/${agentId}`);
        
        if (!response.ok) {
          log(`Chat settings fetch returned status: ${response.status}`);
          // Return null but don't throw, we'll use default settings
          return null;
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          logError('Expected JSON response but got:', contentType);
          return null;
        }
        
        const data = await response.json();
        log('Fetched color settings:', data);
        
        // Update the stored color settings
        colorSettings = data;
        
        // Update existing bubble if it exists
        if (bubbleButton) {
          updateBubbleAppearance();
        }
        
        return data;
      } catch (settingsError) {
        logError('Error fetching settings:', settingsError);
        return null;
      }
    } catch (error) {
      logError('Error in fetchColorSettingsAndVisibility:', error);
      return null;
    }
  }
  
  // Update the bubble appearance with new settings
  function updateBubbleAppearance() {
    if (!bubbleButton || !colorSettings) return;
    
    // If we have a chat icon, use it instead of the default SVG
    if (colorSettings.chat_icon) {
      bubbleButton.innerHTML = `<img src="${colorSettings.chat_icon}" alt="Chat" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
      // Revert to default chat icon
      bubbleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;
    }
    
    // Update bubble color if specified and there's no chat icon (chat icon overrides bubble color)
    if (!colorSettings.chat_icon && colorSettings.bubble_color) {
      bubbleButton.style.backgroundColor = colorSettings.bubble_color;
    }
    
    // Update bubble position if specified
    if (colorSettings.bubble_position) {
      // Reset both positions first
      bubbleButton.style.left = '';
      bubbleButton.style.right = '';
      
      // Set the new position
      bubbleButton.style[colorSettings.bubble_position] = '20px';
    }
    
    // If agent is private, hide the bubble
    if (isPrivate) {
      bubbleButton.style.display = 'none';
    } else if (bubbleButton.style.display === 'none') {
      bubbleButton.style.display = 'flex';
    }
  }
  
  // Initialize the chat widget
  async function init(customConfig = {}) {
    if (initialized) {
      log('Already initialized, skipping');
      return;
    }
    
    // Merge default config with window.wonderwaveConfig and any custom config
    const config = {
      ...defaultConfig,
      ...(window.wonderwaveConfig || {}),
      ...customConfig
    };
    
    // Set debug mode from config
    debugMode = config.debug === true;
    
    log('Initializing with config:', config);
    
    // Validate required config
    if (!config.agentId) {
      logError('agentId is required in window.wonderwaveConfig');
      return;
    }

    try {
      // Fetch visibility and color settings from the backend
      const settings = await fetchColorSettingsAndVisibility(config.agentId);
      
      // If agent is private, don't initialize the widget
      if (isPrivate) {
        log('Agent is private, not initializing widget');
        return;
      }
      
      // Store color settings
      colorSettings = settings;
      
      if (settings) {
        log('Applying color settings from backend');
        
        // Apply color settings
        if (settings.sync_colors && settings.user_message_color) {
          // When sync is enabled, use user message color for both bubble and header
          config.bubbleColor = settings.user_message_color;
          config.headerColor = settings.user_message_color;
          config.userMessageColor = settings.user_message_color;
        } else {
          // When sync is disabled
          if (settings.bubble_color) {
            config.bubbleColor = settings.bubble_color;
          }
          if (settings.user_message_color) {
            config.userMessageColor = settings.user_message_color;
          }
          // Don't set headerColor so it defaults to white/default
        }
        
        // Apply position from backend settings
        if (settings.bubble_position) {
          config.position = settings.bubble_position;
        }
        
        // Apply chat icon from backend settings
        if (settings.chat_icon) {
          config.chatIcon = settings.chat_icon;
        }
      }
      
      // Create the bubble button
      createBubbleButton(config);
      
      // Mark as initialized
      initialized = true;
      
      // Process any queued commands
      processQueue();
      
      // Handle any auto-open logic
      if (config.autoOpen) {
        setTimeout(() => openChat(), config.autoOpenDelay || 1000);
      }

      // Auto show popups if enabled
      if (settings && settings.auto_show_delay && settings.auto_show_delay > 0) {
        setTimeout(() => showPopups(config), settings.auto_show_delay * 1000);
      }
      
      // Set up recurring visibility check (every 30 seconds)
      setInterval(() => {
        fetchColorSettingsAndVisibility(config.agentId);
      }, 30000);
      
      log('Initialization complete');
    } catch (error) {
      logError('Error during initialization:', error);
    }
  }
  
  // Create the chat bubble button
  function createBubbleButton(config) {
    // Create the bubble button if it doesn't exist
    if (bubbleButton) {
      log('Bubble button already exists, skipping creation');
      return;
    }
    
    log('Creating bubble button');
    
    bubbleButton = document.createElement('div');
    bubbleButton.id = 'wonderwave-bubble';
    
    // Use custom chat icon if specified in config or settings, otherwise use default
    if (colorSettings && colorSettings.chat_icon) {
      log('Using custom chat icon from settings:', colorSettings.chat_icon);
      bubbleButton.innerHTML = `<img src="${colorSettings.chat_icon}" alt="Chat" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else if (config.chatIcon) {
      log('Using custom chat icon from config:', config.chatIcon);
      bubbleButton.innerHTML = `<img src="${config.chatIcon}" alt="Chat" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
      log('Using default chat icon');
      bubbleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;
    }
    
    // Determine bubble color
    let bubbleColor;
    if (colorSettings && colorSettings.bubble_color) {
      bubbleColor = colorSettings.bubble_color;
    } else if (config.bubbleColor) {
      bubbleColor = config.bubbleColor;
    } else {
      bubbleColor = defaultConfig.bubbleColor;
    }
    
    // Apply styles
    Object.assign(bubbleButton.style, {
      position: 'fixed',
      bottom: '20px',
      [config.position]: '20px',
      width: config.bubbleSize,
      height: config.bubbleSize,
      borderRadius: '50%',
      backgroundColor: bubbleColor,
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
      cursor: 'pointer',
      zIndex: config.zIndex,
      display: isPrivate ? 'none' : 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      color: '#FFFFFF',
      overflow: 'hidden',
    });
    
    // Add hover effect
    bubbleButton.onmouseenter = function() {
      if (!isPrivate) {
        this.style.transform = 'scale(1.1)';
        this.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.3)';
      }
    };
    
    bubbleButton.onmouseleave = function() {
      if (!isPrivate) {
        this.style.transform = 'scale(1)';
        this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
      }
    };
    
    // Add click handler
    bubbleButton.onclick = function() {
      if (!isPrivate) {
        toggleChat();
      }
    };
    
    // Append to the document
    document.body.appendChild(bubbleButton);
    log('Bubble button created and added to DOM');
  }

  // Show initial message popups
  function showPopups(config) {
    // Don't show popups if chat is already open
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
  
  // Show a single popup message
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
  
  // Create and open the chat iframe
  function createChatIframe(config) {
    if (iframe || isPrivate) return;
    
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
  
  // Handle messages from the iframe
  function handleIframeMessage(event) {
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
  
  // Open the chat widget only if the agent is public
  function openChat() {
    if (!initialized) {
      logError('Chat not initialized. Call init() first.');
      return;
    }
    
    if (isPrivate) {
      logError('Cannot open chat. Agent is private.');
      return;
    }
    
    log('Opening chat');
    
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
    
    // Update bubble button with close icon
    if (bubbleButton) {
      bubbleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    }
  }
  
  // Close the chat widget
  function closeChat() {
    log('Closing chat');
    
    const container = document.getElementById('wonderwave-container');
    if (container) {
      container.style.opacity = '0';
      container.style.transform = 'translateY(20px)';
      
      // Hide after animation completes
      setTimeout(() => {
        container.style.display = 'none';
      }, 300);
    }
    
    // Restore chat icon on the button
    if (bubbleButton) {
      const config = { ...defaultConfig, ...(window.wonderwaveConfig || {}) };
      
      // Use custom chat icon if specified in config, otherwise use default
      if (colorSettings && colorSettings.chat_icon) {
        bubbleButton.innerHTML = `<img src="${colorSettings.chat_icon}" alt="Chat" style="width: 100%; height: 100%; object-fit: cover;">`;
      } else if (config.chatIcon) {
        bubbleButton.innerHTML = `<img src="${config.chatIcon}" alt="Chat" style="width: 100%; height: 100%; object-fit: cover;">`;
      } else {
        bubbleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;
      }
    }
  }
  
  // Toggle the chat widget
  function toggleChat() {
    log('Toggling chat');
    
    const container = document.getElementById('wonderwave-container');
    if (container && container.style.display !== 'none' && container.style.opacity !== '0') {
      closeChat();
    } else {
      openChat();
    }
  }
  
  // Destroy the widget
  function destroy() {
    log('Destroying widget');
    
    // Remove the bubble button
    if (bubbleButton && bubbleButton.parentNode) {
      bubbleButton.parentNode.removeChild(bubbleButton);
      bubbleButton = null;
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
    
    // Reset initialization state
    initialized = false;
    
    log('Widget destroyed');
  }
  
  // Create the public API
  window.wonderwave = function(command, ...args) {
    return handleCommand(command, args);
  };
  
  // Add the command queue to the API
  window.wonderwave.q = window.wonderwave.q || [];
  
  // Add event listener for when the DOM is fully loaded
  document.addEventListener('DOMContentLoaded', function() {
    log('DOM loaded, checking for auto-initialization');
    
    // Initialize automatically if config is present
    if (window.wonderwaveConfig) {
      log('Config found, auto-initializing');
      init();
    }
  });
  
  // Also check if we can initialize immediately if the DOM is already loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    log('DOM already loaded, checking for auto-initialization');
    
    if (window.wonderwaveConfig) {
      log('Config found, auto-initializing');
      setTimeout(init, 0); // Use setTimeout to ensure this runs after the script execution
    }
  }
})();
