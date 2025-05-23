import { log, logError, defaultConfig } from './utils.js';
import { updateBubbleAppearance } from './bubble.js';
import { setRateLimitSettings } from './chat.js';

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
    
    // Build the URL and get auth credentials from config with fallbacks
    const config = window.wonderwaveConfig || defaultConfig;
    const baseUrl = config.supabaseUrl || 'https://lndfjlkzvxbnoxfuboxz.supabase.co';
    const supabaseKey = config.supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuZGZqbGt6dnhibm94ZnVib3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0OTM1MjQsImV4cCI6MjA2MzA2OTUyNH0.81qrGi1n9MpVIGNeJ8oPjyaUbuCKKKXfZXVuF90azFk';
    const url = `${baseUrl}/functions/v1/chat-settings?agentId=${agentId}&_t=${now}`;
    
    log(`Making request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    log(`Response status: ${response.status}`);
    
    // If response is not 200 OK, treat as error but don't hide widget immediately
    if (!response.ok) {
      logError(`Response not OK (${response.status}), but continuing with defaults`);
      // Don't hide widget on HTTP errors - agent might still be public
      // hideWidget();
      return getDefaultSettings();
    }
    
    // Try to parse the response data
    let data;
    try {
      data = await response.json();
      log('Response data:', data);
    } catch (parseError) {
      logError('Error parsing response:', parseError);
      // Don't hide widget on parse errors - use defaults instead
      return getDefaultSettings();
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
    
    // Set rate limiting settings in chat module
    if (data && (data.rate_limit_enabled || data.rate_limit_messages || data.rate_limit_time_window || data.rate_limit_message)) {
      setRateLimitSettings({
        rate_limit_enabled: data.rate_limit_enabled,
        rate_limit_messages: data.rate_limit_messages,
        rate_limit_time_window: data.rate_limit_time_window,
        rate_limit_message: data.rate_limit_message
      });
    }
    
    // Update any existing bubble with new settings
    updateBubbleAppearance();
    
    return data;
  } catch (error) {
    logError('Error fetching settings:', error);
    // Don't hide widget on fetch errors - network might be temporarily down
    // hideWidget();
    return getDefaultSettings();
  }
}

/**
 * Get default settings when API fails
 */
function getDefaultSettings() {
  return {
    visibility: 'public',
    bubble_color: '#3B82F6',
    user_message_color: '#3B82F6',
    sync_colors: false,
    rate_limit_enabled: false,
    rate_limit_messages: 20,
    rate_limit_time_window: 240,
    rate_limit_message: 'Too many messages in a row'
  };
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
