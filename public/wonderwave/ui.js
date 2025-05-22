
// This file serves as a central export point for UI-related functionality

// Re-export from bubble.js and popups.js
import { 
  createBubbleButton, 
  updateBubbleAppearance, 
  getBubbleButton, 
  setBubbleButton 
} from './bubble.js';
import { showPopups } from './popups.js';

// Export all the functions needed
export {
  createBubbleButton,
  updateBubbleAppearance,
  getBubbleButton,
  setBubbleButton,
  showPopups
};
