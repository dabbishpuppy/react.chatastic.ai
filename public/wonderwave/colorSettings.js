
import { log, logError, defaultConfig } from './utils.js';
import { updateBubbleAppearance } from './bubble.js';
import { setRateLimitSettings } from './chat.js';
import { hideWidget, showWidget, isAgentPrivate } from './agentVisibility.js';

// Global settings
let colorSettings = null;
let lastVisibilityCheck = 0;
let failedAgentIds = new Set(); // Track failed agent IDs to avoid repeated requests
const CHECK_INTERVAL = 15000; // 15 seconds

/**
 * Fetch color settings and agent visibility from the Supabase edge function
 */
export async function fetchColorSettingsAndVisibility(agentId) {
  if (!agentId) {
    log('No agentId provided for fetching settings');
    return null;
  }
  
  // Skip if this agent ID has failed before
  if (failedAgentIds.has(agentId)) {
    log(`Skipping request for failed agent ID: ${agentId}`);
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
      return getDefaultSettings();
    }
    
    // Try to parse the response data
    let data;
    try {
      data = await response.json();
      log('Response data:', data);
    } catch (parseError) {
      logError('Error parsing response:', parseError);
      return getDefaultSettings();
    }
    
    // Handle agent not found error gracefully
    if (data && data.error === 'agent_not_found') {
      log(`Agent ${agentId} not found, marking as failed and hiding widget`);
      failedAgentIds.add(agentId);
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
    if (isAgentPrivate()) {
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
 * Check if we need to refresh visibility (if it's been too long since the last check)
 */
export function shouldCheckVisibility() {
  const now = Date.now();
  return (now - lastVisibilityCheck) > CHECK_INTERVAL;
}

/**
 * Clear failed agent IDs (useful for testing or when agents are recreated)
 */
export function clearFailedAgentIds() {
  failedAgentIds.clear();
  log('Cleared failed agent IDs cache');
}
