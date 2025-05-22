import { log, logError, setDebugMode, defaultConfig } from './utils.js';
import { fetchColorSettingsAndVisibility, isAgentPrivate } from './settings.js';
import { createBubbleButton, showPopups, setBubbleButton } from './ui.js';
import { openChat, closeChat, toggleChat, destroy as destroyChat, setIframe } from './chat.js';

// Keep track of initialization state
let initialized = false;

/**
 * Process any commands that were queued before script loaded
 */
export function processQueue() {
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

/**
 * Handle various commands
 */
export function handleCommand(command, params) {
  log('Handling command:', command, params);
  
  switch (command) {
    case 'init':
      init(params[0]);
      return 'initialized';
    case 'open':
      if (!isAgentPrivate()) {
        openChat();
        return 'opened';
      }
      return 'agent-private';
    case 'close':
      closeChat();
      return 'closed';
    case 'toggle':
      if (!isAgentPrivate()) {
        toggleChat();
        return 'toggled';
      }
      return 'agent-private';
    case 'destroy':
      destroy();
      return 'destroyed';
    case 'debug':
      setDebugMode(params[0] === true);
      return setDebugMode();
    case 'getState':
      if (isAgentPrivate()) {
        return 'agent-private';
      }
      return initialized ? 'initialized' : 'not-initialized';
    case 'refreshSettings':
      fetchColorSettingsAndVisibility(window.wonderwaveConfig?.agentId);
      return 'refreshing';
    default:
      logError(`Unknown command "${command}"`);
      return 'error-unknown-command';
  }
}

/**
 * Initialize the chat widget
 */
export async function init(customConfig = {}) {
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
  setDebugMode(config.debug === true);
  
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
    if (isAgentPrivate()) {
      log('Agent is private, stopping initialization');
      return;
    }
    
    if (settings) {
      log('Applying color settings from backend');
      
      // Apply color settings
      if (settings.sync_colors && settings.user_message_color) {
        config.bubbleColor = settings.user_message_color;
        config.headerColor = settings.user_message_color;
        config.userMessageColor = settings.user_message_color;
      } else {
        if (settings.bubble_color) {
          config.bubbleColor = settings.bubble_color;
        }
        if (settings.user_message_color) {
          config.userMessageColor = settings.user_message_color;
        }
      }
      
      // Apply position from backend settings
      if (settings.bubble_position) {
        config.position = settings.bubble_position;
      }
      
      // Apply chat icon from backend settings
      if (settings.chat_icon) {
        config.chatIcon = settings.chat_icon;
        log('Setting chat icon from settings:', settings.chat_icon);
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
      setTimeout(() => {
        if (!isAgentPrivate()) {
          openChat();
        }
      }, config.autoOpenDelay || 1000);
    }

    // Auto show popups if enabled
    if (settings && settings.auto_show_delay && settings.auto_show_delay > 0) {
      setTimeout(() => {
        if (!isAgentPrivate()) {
          showPopups(config);
        }
      }, settings.auto_show_delay * 1000);
    }
    
    log('Initialization complete');
  } catch (error) {
    logError('Error during initialization:', error);
  }
}

/**
 * Destroy the widget
 */
export function destroy() {
  destroyChat();
  setBubbleButton(null);
  setIframe(null);
  
  // Reset initialization state
  initialized = false;
  
  log('Widget destroyed');
}

/**
 * Check if widget is initialized
 */
export function isInitialized() {
  return initialized;
}
