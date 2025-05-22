
/**
 * WonderWave Chat Widget v1.0
 * A lightweight embeddable chat widget for any website
 */
(function() {
  'use strict';

  // Keep track of initialization state
  let initialized = false;
  let iframe = null;
  let bubbleButton = null;
  
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
  
  // Process any commands that were queued before script loaded
  function processQueue() {
    const queue = window.wonderwave.q || [];
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
    switch (command) {
      case 'init':
        init(params[0]);
        break;
      case 'open':
        openChat();
        break;
      case 'close':
        closeChat();
        break;
      case 'toggle':
        toggleChat();
        break;
      case 'destroy':
        destroy();
        break;
      case 'getState':
        return initialized ? 'initialized' : 'not-initialized';
      default:
        console.warn(`WonderWave: Unknown command "${command}"`);
    }
  }
  
  // Initialize the chat widget
  function init(customConfig = {}) {
    if (initialized) return;
    
    // Merge default config with window.wonderwaveConfig and any custom config
    const config = {
      ...defaultConfig,
      ...(window.wonderwaveConfig || {}),
      ...customConfig
    };
    
    // Validate required config
    if (!config.agentId) {
      console.error('WonderWave: agentId is required in window.wonderwaveConfig');
      return;
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
  }
  
  // Create the chat bubble button
  function createBubbleButton(config) {
    // Create the bubble button if it doesn't exist
    if (bubbleButton) return;
    
    bubbleButton = document.createElement('div');
    bubbleButton.id = 'wonderwave-bubble';
    
    // Use custom chat icon if specified in config, otherwise use default
    if (config.chatIcon) {
      bubbleButton.innerHTML = `<img src="${config.chatIcon}" alt="Chat" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
      bubbleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;
    }
    
    // Apply styles
    Object.assign(bubbleButton.style, {
      position: 'fixed',
      bottom: '20px',
      [config.position]: '20px',
      width: config.bubbleSize,
      height: config.bubbleSize,
      borderRadius: '50%',
      backgroundColor: config.bubbleColor,
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
      cursor: 'pointer',
      zIndex: config.zIndex,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      color: '#FFFFFF',
      overflow: 'hidden',
    });
    
    // Add hover effect
    bubbleButton.onmouseenter = function() {
      this.style.transform = 'scale(1.1)';
      this.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.3)';
    };
    
    bubbleButton.onmouseleave = function() {
      this.style.transform = 'scale(1)';
      this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    };
    
    // Add click handler
    bubbleButton.onclick = toggleChat;
    
    // Append to the document
    document.body.appendChild(bubbleButton);
  }
  
  // Create and open the chat iframe
  function createChatIframe(config) {
    if (iframe) return;
    
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
  
  // Open the chat widget
  function openChat() {
    if (!initialized) {
      console.warn('WonderWave: Chat not initialized. Call init() first.');
      return;
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
      bubbleButton.innerHTML = config.bubbleIcon;
    }
  }
  
  // Toggle the chat widget
  function toggleChat() {
    const container = document.getElementById('wonderwave-container');
    if (container && container.style.display !== 'none' && container.style.opacity !== '0') {
      closeChat();
    } else {
      openChat();
    }
  }
  
  // Destroy the widget
  function destroy() {
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
    
    // Remove event listeners
    window.removeEventListener('message', handleIframeMessage);
    
    // Reset initialization state
    initialized = false;
  }
  
  // Create the public API
  window.wonderwave = function(command, ...args) {
    return handleCommand(command, args);
  };
  
  // Add the command queue to the API
  window.wonderwave.q = window.wonderwave.q || [];
  
  // Initialize automatically if config is present
  if (window.wonderwaveConfig) {
    init();
  }
})();
