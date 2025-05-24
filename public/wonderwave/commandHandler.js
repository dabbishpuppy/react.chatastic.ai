
import { log, logError, setDebugMode } from './utils.js';
import { isAgentPrivate, shouldCheckVisibility, fetchColorSettingsAndVisibility } from './settings.js';
import { openChat, closeChat, toggleChat } from './chat.js';
import { init, destroy, isInitialized } from './initialization.js';

// Check if we should prevent initialization before processing any commands
function shouldPreventInitialization() {
  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  const currentHost = window.location.hostname;
  
  return currentPath.includes('/integrations') || 
         currentPath.includes('/embed') || 
         currentPath.includes('/settings') ||
         currentSearch.includes('tab=embed') ||
         currentSearch.includes('tab=share') ||
         currentSearch.includes('tab=integrations') ||
         currentHost.includes('lovable.app') ||
         currentHost.includes('localhost');
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
      return isInitialized() ? 'initialized' : 'not-initialized';
    case 'refreshSettings':
      fetchColorSettingsAndVisibility(window.wonderwaveConfig?.agentId);
      return 'refreshing';
    default:
      logError(`Unknown command "${command}"`);
      return 'error-unknown-command';
  }
}
