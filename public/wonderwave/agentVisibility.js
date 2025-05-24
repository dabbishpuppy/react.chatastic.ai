
import { log, logError } from './utils.js';

// Global state for agent privacy
let isPrivate = false;

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
 * Hide the widget components when the agent is private
 */
export function hideWidget() {
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
export function showWidget() {
  isPrivate = false;
  
  // Show the chat bubble if it exists
  const existingBubble = document.getElementById('wonderwave-bubble');
  if (existingBubble) {
    existingBubble.style.display = 'flex';
  }
}
