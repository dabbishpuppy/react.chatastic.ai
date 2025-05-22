
import { log, logError, defaultConfig } from './utils.js';
import { updateBubbleAppearance } from './bubble.js';

// Global settings
let colorSettings = null;
let isPrivate = false;
let lastVisibilityCheck = 0;
const CHECK_INTERVAL = 15000; // 15 seconds

/**
 * Fetch color settings and agent visibility from the backend
 */
export async function fetchColorSettingsAndVisibility(agentId) {
  if (!agentId) {
    log('No agentId provided for fetching settings');
    return null;
  }
  
  // Track when we last checked visibility
  const now = Date.now();
  lastVisibilityCheck = now;
  
  try {
    log(`Fetching settings for agent ${agentId}`);
    
    // Always add a unique timestamp to bust cache
    const timestamp = now;
    const url = `https://lndfjlkzvxbnoxfuboxz.supabase.co/functions/v1/chat-settings/${agentId}?_t=${timestamp}`;
    
    try {
      log(`Making request to: ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      log(`Response status: ${response.status}`);
      
      // Try to parse the response data
      let data;
      try {
        data = await response.json();
        log('Response data:', data);
      } catch (parseError) {
        logError('Error parsing response:', parseError);
        // Default to private on parsing errors for security
        hideWidget();
        return null;
      }
      
      // Always check for visibility in the response
      if (data && data.visibility === 'private') {
        log('Agent is PRIVATE, hiding widget');
        hideWidget();
        return null;
      }
      
      // If we get here and we previously thought the agent was private, show it
      if (isPrivate) {
        log('Agent is now PUBLIC, showing widget');
        showWidget();
      }
      
      // Store the settings
      colorSettings = data;
      
      // Update any existing bubble with new settings
      updateBubbleAppearance();
      
      return data;
    } catch (error) {
      logError('Error fetching settings:', error);
      // On network errors, default to private for security
      hideWidget();
      return null;
    }
  } catch (error) {
    logError('Error in fetchColorSettingsAndVisibility:', error);
    // On errors, default to private for security
    hideWidget();
    return null;
  }
}

/**
 * Hide the widget components when the agent is private
 */
function hideWidget() {
  isPrivate = true;
  
  // Hide the chat bubble if it exists
  const existingBubble = document.getElementById('wonderwave-bubble');
  if (existingBubble) {
    existingBubble.style.display = 'none';
  }
  
  // Hide the chat container if it exists
  const container = document.getElementById('wonderwave-container');
  if (container) {
    container.style.display = 'none';
  }
}

/**
 * Show the widget components when the agent is public
 */
function showWidget() {
  isPrivate = false;
  
  // Show the chat bubble if it exists
  const existingBubble = document.getElementById('wonderwave-bubble');
  if (existingBubble) {
    existingBubble.style.display = 'flex';
  }
}

/**
 * Get color settings
 */
export function getColorSettings() {
  return colorSettings;
}

/**
 * Set color settings
 */
export function setColorSettings(settings) {
  colorSettings = settings;
}

/**
 * Check if agent is private
 */
export function isAgentPrivate() {
  return isPrivate;
}

/**
 * Set agent privacy status
 */
export function setAgentPrivacy(privacy) {
  if (privacy) {
    hideWidget();
  } else {
    showWidget();
  }
}

/**
 * Check if we need to refresh visibility (if it's been too long since the last check)
 */
export function shouldCheckVisibility() {
  const now = Date.now();
  return (now - lastVisibilityCheck) > CHECK_INTERVAL;
}

// Listen for messages to refresh settings
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'wonderwave-refresh-settings') {
    const agentId = event.data.agentId || window.wonderwaveConfig?.agentId;
    if (agentId) {
      log('Received refresh settings message for agent:', agentId);
      // Force re-check of agent visibility immediately
      fetchColorSettingsAndVisibility(agentId);
    }
  }
});

// Set up an interval to regularly check agent visibility
setInterval(() => {
  const agentId = window.wonderwaveConfig?.agentId;
  if (agentId) {
    log('Periodic visibility check for agent:', agentId);
    fetchColorSettingsAndVisibility(agentId);
  }
}, CHECK_INTERVAL);

// Also check whenever the page becomes visible again
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const agentId = window.wonderwaveConfig?.agentId;
    if (agentId) {
      log('Page became visible, checking agent visibility');
      fetchColorSettingsAndVisibility(agentId);
    }
  }
});

// Run a check immediately when the script loads
setTimeout(() => {
  const agentId = window.wonderwaveConfig?.agentId;
  if (agentId) {
    fetchColorSettingsAndVisibility(agentId);
  }
}, 50);
