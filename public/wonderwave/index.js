
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
  
  // Log that the script has loaded
  log('WonderWave script loaded');
  
  // Function to ensure the chat bubble is created
  const ensureBubbleExists = () => {
    log('Ensuring bubble exists');
    const bubbleExists = document.getElementById('wonderwave-bubble');
    if (!bubbleExists && window.wonderwaveConfig) {
      log('No bubble found, creating one');
      import('./bubble.js').then(({ createBubbleButton }) => {
        createBubbleButton(window.wonderwaveConfig);
      }).catch(err => {
        logError('Error importing bubble module:', err);
      });
    } else {
      log('Bubble already exists or no config found');
    }
  };
  
  // Add event listener for when the DOM is fully loaded
  document.addEventListener('DOMContentLoaded', function() {
    log('DOM loaded, checking for auto-initialization');
    
    // Initialize automatically if config is present
    if (window.wonderwaveConfig) {
      log('Config found, auto-initializing');
      init();
      
      // Ensure bubble is created after a small delay
      setTimeout(ensureBubbleExists, 500);
    }
  });
  
  // Also check if we can initialize immediately if the DOM is already loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    log('DOM already loaded, checking for auto-initialization');
    
    if (window.wonderwaveConfig) {
      log('Config found, auto-initializing');
      setTimeout(() => {
        init();
        // Ensure bubble is created after a small delay
        setTimeout(ensureBubbleExists, 500);
      }, 0); // Use setTimeout to ensure this runs after the script execution
    }
  }
  
  // Set up a periodic check to ensure the bubble exists
  setInterval(ensureBubbleExists, 5000);
})();
