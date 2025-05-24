import { log, logError, setDebugMode, defaultConfig } from './utils.js';
import { fetchColorSettingsAndVisibility, isAgentPrivate, shouldCheckVisibility } from './settings.js';
import { createBubbleButton, showPopups, setBubbleButton } from './ui.js';
import { openChat, closeChat, toggleChat, destroy as destroyChat, setIframe } from './chat.js';

// Keep track of initialization state
let initialized = false;
let visibilityCheckInterval = null;
let rateLimitCountdown = null;
let rateLimitCountdownInterval = null;

// Rate limiting storage keys
const RATE_LIMIT_PREFIX = 'wonderwave_rate_limit_';
const MESSAGE_TIMESTAMPS_SUFFIX = '_timestamps';

// Rate limiting functions
function getRateLimitKey(agentId) {
  return RATE_LIMIT_PREFIX + agentId + MESSAGE_TIMESTAMPS_SUFFIX;
}

function getMessageTimestamps(agentId) {
  try {
    const key = getRateLimitKey(agentId);
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    
    const timestamps = JSON.parse(stored);
    return Array.isArray(timestamps) ? timestamps : [];
  } catch (error) {
    logError('Error reading rate limit timestamps:', error);
    return [];
  }
}

function saveMessageTimestamps(agentId, timestamps) {
  try {
    const key = getRateLimitKey(agentId);
    localStorage.setItem(key, JSON.stringify(timestamps));
  } catch (error) {
    logError('Error saving rate limit timestamps:', error);
  }
}

function cleanOldTimestamps(timestamps, timeWindowSeconds) {
  const now = Date.now();
  const timeWindowMs = timeWindowSeconds * 1000;
  
  return timestamps.filter(timestamp => {
    return (now - timestamp) < timeWindowMs;
  });
}

async function fetchRateLimitSettings(agentId) {
  try {
    const response = await fetch(`https://lndfjlkzvxbnoxfuboxz.supabase.co/functions/v1/chat-settings?agentId=${agentId}`);
    const data = await response.json();
    
    return {
      rate_limit_enabled: data.rate_limit_enabled || false,
      rate_limit_messages: data.rate_limit_messages || 20,
      rate_limit_time_window: data.rate_limit_time_window || 240,
      rate_limit_message: data.rate_limit_message || 'Too many messages in a row'
    };
  } catch (error) {
    logError('Error fetching rate limit settings:', error);
    return {
      rate_limit_enabled: false,
      rate_limit_messages: 20,
      rate_limit_time_window: 240,
      rate_limit_message: 'Too many messages in a row'
    };
  }
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

async function checkRateLimit(agentId) {
  try {
    const settings = await fetchRateLimitSettings(agentId);
    
    if (!settings.rate_limit_enabled) {
      return { exceeded: false, remaining: null, resetTime: null };
    }

    const { rate_limit_messages, rate_limit_time_window, rate_limit_message } = settings;
    
    // Get current timestamps
    let timestamps = getMessageTimestamps(agentId);
    
    // Clean old timestamps
    timestamps = cleanOldTimestamps(timestamps, rate_limit_time_window);
    
    // Check if limit is exceeded
    const exceeded = timestamps.length >= rate_limit_messages;
    
    // Calculate reset time (when the oldest message will expire)
    let resetTime = null;
    let timeUntilReset = null;
    if (timestamps.length > 0) {
      const oldestTimestamp = Math.min(...timestamps);
      resetTime = new Date(oldestTimestamp + (rate_limit_time_window * 1000));
      timeUntilReset = Math.max(0, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
    }
    
    // Save cleaned timestamps
    saveMessageTimestamps(agentId, timestamps);
    
    log(`Rate limit check for ${agentId}: ${timestamps.length}/${rate_limit_messages} messages in ${rate_limit_time_window}s window`);
    
    // Start countdown if rate limit exceeded
    if (exceeded && timeUntilReset > 0) {
      startRateLimitCountdown(timeUntilReset, rate_limit_message);
    }
    
    return {
      exceeded,
      resetTime,
      timeUntilReset,
      message: rate_limit_message,
      current: timestamps.length,
      limit: rate_limit_messages,
      timeWindow: rate_limit_time_window
    };
    
  } catch (error) {
    logError('Error checking rate limit:', error);
    // On error, allow the message (fail open)
    return { exceeded: false, remaining: null, resetTime: null };
  }
}

function recordMessage(agentId) {
  try {
    // Get current timestamps
    let timestamps = getMessageTimestamps(agentId);
    
    // Add new timestamp
    timestamps.push(Date.now());
    
    // Save updated timestamps
    saveMessageTimestamps(agentId, timestamps);
    
    log(`Recorded new message for ${agentId}. Total: ${timestamps.length}`);
    
  } catch (error) {
    logError('Error recording message timestamp:', error);
  }
}

// Export rate limiting functions for use in other modules
export { checkRateLimit, recordMessage };

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
