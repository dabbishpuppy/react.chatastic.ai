
import { log, logError } from './utils.js';

// Global state for agent privacy and existence
let isPrivate = false;
let agentExists = true;

/**
 * Check if agent is private
 */
export function isAgentPrivate() {
  return isPrivate;
}

/**
 * Check if agent exists
 */
export function doesAgentExist() {
  return agentExists;
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
 * Set agent existence status
 */
export function setAgentExists(exists) {
  agentExists = exists;
  if (!exists) {
    hideWidget();
  }
}

/**
 * Hide the widget components when the agent is private or doesn't exist
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
 * Show the widget components when the agent is public and exists
 */
export function showWidget() {
  isPrivate = false;
  
  // Only show if agent exists
  if (agentExists) {
    // Show the chat bubble if it exists
    const existingBubble = document.getElementById('wonderwave-bubble');
    if (existingBubble) {
      existingBubble.style.display = 'flex';
    }
  }
}
