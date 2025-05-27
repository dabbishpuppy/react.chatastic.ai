
import { log, logError, setDebugMode, defaultConfig } from './utils.js';
import { fetchColorSettingsAndVisibility, isAgentPrivate, shouldCheckVisibility } from './settings.js';
import { createBubbleButton, setBubbleButton } from './ui.js';
import { openChat, destroy as destroyChat, setIframe } from './chat.js';
import { showPopups } from './popups.js';

// Keep track of initialization state
let initialized = false;
let visibilityCheckInterval = null;

/**
 * Check if we're on a dashboard page with no agents
 */
function isOnDashboardWithNoAgents() {
  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  
  // Check if we're on dashboard
  if (currentPath.includes('/dashboard')) {
    // Check if there are any agents by looking at the DOM or config
    // If no agentId is provided, assume no agents exist
    const config = window.wonderwaveConfig;
    if (!config || !config.agentId) {
      log('On dashboard with no agent ID configured, skipping widget initialization');
      return true;
    }
  }
  
  return false;
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
  
  // Check if we're on dashboard with no agents
  if (isOnDashboardWithNoAgents()) {
    log('On dashboard with no agents, skipping widget initialization');
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
    
    // If agent is private or doesn't exist, don't initialize the widget
    if (isAgentPrivate() || !settings) {
      log('Agent is private or does not exist, not initializing widget');
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
      // Only check if we have a valid agent ID
      if (config.agentId) {
        // Force a re-check of visibility
        fetchColorSettingsAndVisibility(config.agentId);
        
        // If agent becomes private, destroy the widget immediately
        if (isAgentPrivate()) {
          log('Agent became private during check interval, destroying widget');
          destroy();
        }
      }
    }, 30000); // Check every 30 seconds (less frequent to reduce load)
    
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

/**
 * Check if we should prevent initialization
 */
function shouldPreventInitialization() {
  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  const currentHost = window.location.hostname;
  
  // Don't initialize on integrations, embed, or settings pages
  return currentPath.includes('/integrations') || 
         currentPath.includes('/embed') || 
         currentPath.includes('/settings') ||
         currentSearch.includes('tab=embed') ||
         currentSearch.includes('tab=share') ||
         currentSearch.includes('tab=integrations') ||
         currentHost.includes('lovable.app') ||
         currentHost.includes('localhost');
}
