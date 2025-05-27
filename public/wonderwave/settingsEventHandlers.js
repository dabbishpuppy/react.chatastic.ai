
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
  if (event.data && event.data.type === 'wonderwave-refresh-settings') {
    const agentId = event.data.agentId || window.wonderwaveConfig?.agentId;
    if (agentId) {
      log('Received refresh settings message for agent:', agentId);
      // Force re-check of agent visibility immediately
      fetchColorSettingsAndVisibility(agentId);
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
