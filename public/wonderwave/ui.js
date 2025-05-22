
import { log } from './utils.js';
import { getColorSettings, isAgentPrivate } from './settings.js';
import { createBubbleButton, updateBubbleAppearance, getBubbleButton, setBubbleButton } from './bubble.js';
import { showPopups } from './popups.js';

// Export all the functions needed from the refactored modules
export {
  createBubbleButton,
  updateBubbleAppearance,
  getBubbleButton,
  setBubbleButton,
  showPopups
};
