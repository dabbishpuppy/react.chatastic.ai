
import { log, logError, defaultConfig } from './utils.js';
import { isAgentPrivate } from './settings.js';
import { doesAgentExist } from './agentVisibility.js';
import { handleMessageSend } from './messageHandling.js';

/**
 * Create and open the chat iframe
 */
export function createChatIframe(config, chatOpen, closeChat) {
  if (isAgentPrivate() || !doesAgentExist()) return null;
  
  // Create chat container
  const container = document.createElement('div');
  container.id = 'wonderwave-container';
  
  // Apply container styles with fixed dimensions
  Object.assign(container.style, {
    position: 'fixed',
    bottom: '90px',
    [config.position]: '20px',
    width: '450px',
    height: '800px',
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
  const iframe = document.createElement('iframe');
  
  // Build URL with parameters - ALWAYS add source=bubble for bubble widget
  let iframeSrc = `https://${config.cdnDomain}/embed/${config.agentId}`;
  
  // Always add source=bubble for bubble widget - this is crucial for proper source detection
  const urlParams = new URLSearchParams();
  urlParams.set('source', 'bubble');
  
  log('🎯 Setting iframe source parameter to: bubble');
  
  // Append identity hash params if they exist
  if (config.identityHash && config.userId) {
    urlParams.set('identityHash', config.identityHash);
    urlParams.set('userId', config.userId);
  }
  
  // Append theme and color parameters 
  if (config.theme) urlParams.set('theme', config.theme);
  if (config.userMessageColor) urlParams.set('userColor', config.userMessageColor);
  if (config.headerColor) urlParams.set('headerColor', config.headerColor);
  
  // Add cache buster to ensure latest version
  urlParams.set('_t', Date.now().toString());
  
  iframeSrc += '?' + urlParams.toString();
  
  log('🔗 Final iframe URL:', iframeSrc);
  
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
  const messageHandler = (event) => handleIframeMessage(event, iframe, closeChat);
  window.addEventListener('message', messageHandler);
  
  // Animate in
  setTimeout(() => {
    container.style.opacity = '1';
    container.style.transform = 'translateY(0)';
  }, 10);
  
  // Send refresh message to iframe once loaded
  iframe.onload = function() {
    try {
      iframe.contentWindow.postMessage({ 
        type: 'wonderwave-refresh-settings',
        agentId: config.agentId 
      }, '*');
    } catch (error) {
      logError('Error sending refresh message to iframe:', error);
    }
  };
  
  return { iframe, messageHandler };
}

/**
 * Handle messages from the iframe
 */
export function handleIframeMessage(event, iframe, closeChat) {
  // Make sure the message is from our iframe
  if (!iframe || event.source !== iframe.contentWindow) return;
  
  // Handle different message types
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'close-widget':
        // Handle close button click inside iframe
        closeChat();
        break;
        
      case 'send-message':
        // Handle message sending with rate limiting
        log('Received send-message request from iframe:', event.data);
        handleMessageSend(event.data, iframe);
        break;
    }
  }
}
