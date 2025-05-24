

import { log, logError, setDebugMode, defaultConfig } from './utils.js';
import { fetchColorSettingsAndVisibility, isAgentPrivate, shouldCheckVisibility } from './settings.js';
import { createBubbleButton, showPopups, setBubbleButton } from './ui.js';
import { openChat, closeChat, toggleChat, destroy as destroyChat, setIframe } from './chat.js';
import { checkRateLimit, recordMessage } from './rateLimit.js';

// Keep track of initialization state
let initialized = false;
let visibilityCheckInterval = null;
let rateLimitCountdown = null;
let rateLimitCountdownInterval = null;

// Check if we're on a page where the widget should not initialize
function shouldPreventInitialization() {
  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  const currentHost = window.location.hostname;
  
  // Don't initialize on integrations, embed, or settings pages
  if (currentPath.includes('/integrations') || 
      currentPath.includes('/embed') || 
      currentPath.includes('/settings') ||
      currentSearch.includes('tab=embed') ||
      currentSearch.includes('tab=share') ||
      currentSearch.includes('tab=integrations') ||
      currentHost.includes('lovable.app') ||
      currentHost.includes('localhost')) {
    log('Preventing widget initialization on admin/config page:', currentPath + currentSearch);
    return true;
  }
  
  return false;
}

function startRateLimitCountdown(timeUntilReset, message) {
  // Clear any existing countdown
  if (rateLimitCountdownInterval) {
    clearInterval(rateLimitCountdownInterval);
  }
  
  rateLimitCountdown = timeUntilReset;
  
  // Show initial error message
  showRateLimitError(message, rateLimitCountdown);
  
  rateLimitCountdownInterval = setInterval(() => {
    rateLimitCountdown--;
    
    if (rateLimitCountdown <= 0) {
      clearInterval(rateLimitCountdownInterval);
      rateLimitCountdownInterval = null;
      rateLimitCountdown = null;
      hideRateLimitError();
    } else {
      updateRateLimitError(message, rateLimitCountdown);
    }
  }, 1000);
}

function showRateLimitError(message, countdown) {
  // Implementation would depend on your UI framework
  // This is a placeholder for showing the error in the chat bubble
  log(`Rate limit error: ${message}. Try again in ${countdown} seconds.`);
}

function updateRateLimitError(message, countdown) {
  // Implementation would depend on your UI framework
  // This is a placeholder for updating the countdown display
  log(`Rate limit countdown: ${countdown} seconds remaining.`);
}

function hideRateLimitError() {
  // Implementation would depend on your UI framework
  // This is a placeholder for hiding the error message
  log('Rate limit error cleared.');
}

/**
 * Process any commands that were queued before script loaded
 */
export function processQueue() {
  // Don't process queue if we should prevent initialization
  if (shouldPreventInitialization()) {
    log('Skipping queue processing on admin/config page');
    return;
  }
  
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
  
  // Check if we should prevent initialization before processing any commands
  if (shouldPreventInitialization() && command !== 'getState' && command !== 'debug' && command !== 'destroy') {
    log(`Command ${command} blocked - on admin/config page`);
    return 'blocked-admin-page';
  }
  
  // First check if we need to refresh visibility
  if (shouldCheckVisibility()) {
    const agentId = window.wonderwaveConfig?.agentId;
    if (agentId) {
      fetchColorSettingsAndVisibility(agentId);
    }
  }
  
  // Don't allow any commands if the agent is private
  if (isAgentPrivate() && command !== 'getState' && command !== 'debug' && command !== 'destroy') {
    log(`Command ${command} blocked - agent is private`);
    return 'agent-private';
  }
  
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
      setDebugMode(params[0] === true);
      return setDebugMode();
    case 'getState':
      if (isAgentPrivate()) {
        return 'agent-private';
      }
      if (shouldPreventInitialization()) {
        return 'blocked-admin-page';
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
  
  // Check if we should prevent initialization
  if (shouldPreventInitialization()) {
    log('Skipping initialization on admin/config page');
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
      log('Agent is private, not initializing widget');
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
      setTimeout(() => openChat(), config.autoOpenDelay || 1000);
    }

    // Auto show popups if enabled
    if (settings && settings.auto_show_delay && settings.auto_show_delay > 0) {
      setTimeout(() => showPopups(config), settings.auto_show_delay * 1000);
    }
    
    // Set up visibility check interval - more frequent checks
    clearInterval(visibilityCheckInterval);
    visibilityCheckInterval = setInterval(() => {
      // Force a re-check of visibility
      fetchColorSettingsAndVisibility(config.agentId);
      
      // If agent becomes private, destroy the widget immediately
      if (isAgentPrivate()) {
        log('Agent became private during check interval, destroying widget');
        destroy();
      }
    }, 10000); // Check every 10 seconds
    
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
  
  // Clear visibility check interval
  if (visibilityCheckInterval) {
    clearInterval(visibilityCheckInterval);
    visibilityCheckInterval = null;
  }
  
  // Clear rate limit countdown interval
  if (rateLimitCountdownInterval) {
    clearInterval(rateLimitCountdownInterval);
    rateLimitCountdownInterval = null;
  }
  
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

// Export rate limiting functions for use in other modules
export { checkRateLimit, recordMessage };
