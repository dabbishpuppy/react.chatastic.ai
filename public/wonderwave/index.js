
/**
 * WonderWave Chat Widget v1.3
 * A lightweight embeddable chat widget for any website
 * 
 * This is the main entry point that loads all modules
 */
import { init, processQueue, handleCommand } from './core.js';
import { createBubbleButton, showPopups, updateBubbleAppearance } from './ui.js';
import { openChat, closeChat, toggleChat, createChatIframe, handleIframeMessage } from './chat.js';
import { fetchColorSettingsAndVisibility } from './settings.js';
import { log, logError } from './utils.js';

// Self-executing function to avoid polluting global scope
(function() {
  'use strict';

  // Initialize state
  let initialized = false;
  
  // Create the public API
  window.wonderwave = function(command, ...args) {
    return handleCommand(command, args);
  };
  
  // Add the command queue to the API
  window.wonderwave.q = window.wonderwave.q || [];
  
  // Add event listener for when the DOM is fully loaded
  document.addEventListener('DOMContentLoaded', function() {
    log('DOM loaded, checking for auto-initialization');
    
    // Initialize automatically if config is present
    if (window.wonderwaveConfig) {
      log('Config found, auto-initializing');
      init();
    }
  });
  
  // Also check if we can initialize immediately if the DOM is already loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    log('DOM already loaded, checking for auto-initialization');
    
    if (window.wonderwaveConfig) {
      log('Config found, auto-initializing');
      setTimeout(init, 0); // Use setTimeout to ensure this runs after the script execution
    }
  }
})();
