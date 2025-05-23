import { log, logError, defaultConfig } from './utils.js';
import { updateBubbleAppearance } from './bubble.js';

// Global settings
let colorSettings = null;
let isPrivate = false;
let lastVisibilityCheck = 0;
const CHECK_INTERVAL = 15000; // 15 seconds

/**
 * Fetch color settings and agent visibility from the Supabase edge function
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
    
    // Build the URL from config with fallback
    const config = window.wonderwaveConfig || defaultConfig;
    const baseUrl = config.supabaseUrl || 'https://lndfjlkzvxbnoxfuboxz.supabase.co';
    const url = `${baseUrl}/functions/v1/chat-settings?agentId=${agentId}&_t=${now}`;
    
    log(`Making request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    log(`Response status: ${response.status}`);
    
    // If response is not 200 OK, hide widget for security
    if (!response.ok) {
      log(`Response not OK (${response.status}), hiding widget for security`);
      hideWidget();
      return null;
    }
    
    // Try to parse the response data
    let data;
    try {
      data = await response.json();
      log('Response data:', data);
    } catch (parseError) {
      logError('Error parsing response:', parseError);
      hideWidget();
      return null;
    }
    
    // Check for visibility in the response
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
