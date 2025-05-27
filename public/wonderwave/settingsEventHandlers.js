
import { log } from './utils.js';
import { fetchColorSettingsAndVisibility } from './colorSettings.js';

const CHECK_INTERVAL = 15000; // 15 seconds

/**
 * Initialize all event handlers for settings
 */
export function initializeSettingsEventHandlers() {
  // Listen for messages to refresh settings
  window.addEventListener('message', handleRefreshMessage);
  
  // Set up an interval to regularly check agent visibility
  setInterval(handlePeriodicVisibilityCheck, CHECK_INTERVAL);
  
  // Also check whenever the page becomes visible again
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Run a check immediately when the script loads
  setTimeout(handleInitialCheck, 50);
}

/**
 * Handle refresh settings messages
 */
function handleRefreshMessage(event) {
  // Handle both color settings and lead settings updates
  if (event.data && (
    event.data.type === 'wonderwave-refresh-settings' || 
    event.data.type === 'lead-settings-updated'
  )) {
    const agentId = event.data.agentId || window.wonderwaveConfig?.agentId;
    if (agentId) {
      log('Received settings update message for agent:', agentId, 'type:', event.data.type);
      // Force re-check of agent visibility and settings immediately
      fetchColorSettingsAndVisibility(agentId);
      
      // Forward the message to iframe if it exists
      const iframe = document.querySelector('iframe[src*="/embed/"]');
      if (iframe && iframe.contentWindow) {
        log('Forwarding settings update to iframe');
        iframe.contentWindow.postMessage({
          type: 'wonderwave-refresh-settings',
          agentId: agentId,
          settings: event.data.settings
        }, '*');
      }
    }
  }
}

/**
 * Handle periodic visibility checks
 */
function handlePeriodicVisibilityCheck() {
  const agentId = window.wonderwaveConfig?.agentId;
  if (agentId) {
    log('Periodic visibility check for agent:', agentId);
    fetchColorSettingsAndVisibility(agentId);
  }
}

/**
 * Handle page visibility changes
 */
function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    const agentId = window.wonderwaveConfig?.agentId;
    if (agentId) {
      log('Page became visible, checking agent visibility');
      fetchColorSettingsAndVisibility(agentId);
    }
  }
}

/**
 * Handle initial check when script loads
 */
function handleInitialCheck() {
  const agentId = window.wonderwaveConfig?.agentId;
  if (agentId) {
    fetchColorSettingsAndVisibility(agentId);
  }
}
