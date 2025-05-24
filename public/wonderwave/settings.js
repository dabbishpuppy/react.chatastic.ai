
// Re-export all functionality from the refactored modules
export { 
  fetchColorSettingsAndVisibility, 
  getColorSettings, 
  setColorSettings,
  shouldCheckVisibility 
} from './colorSettings.js';

export { 
  isAgentPrivate, 
  setAgentPrivacy, 
  hideWidget, 
  showWidget 
} from './agentVisibility.js';

export { 
  initializeSettingsEventHandlers 
} from './settingsEventHandlers.js';

// Initialize event handlers when this module is loaded
import { initializeSettingsEventHandlers } from './settingsEventHandlers.js';
initializeSettingsEventHandlers();
