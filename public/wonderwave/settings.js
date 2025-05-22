
import { log, logError, defaultConfig } from './utils.js';
import { updateBubbleAppearance } from './bubble.js';

// Global settings
let colorSettings = null;
let isPrivate = false;

/**
 * Fetch color settings and agent visibility from the backend
 */
export async function fetchColorSettingsAndVisibility(agentId) {
  if (!agentId) {
    log('No agentId provided for fetching settings');
    return null;
  }
  
  try {
    log(`Fetching settings for agent ${agentId}`);
    
    // First, check agent visibility with better error handling
    try {
      // Add timestamp to prevent caching issues
      const timestamp = new Date().getTime();
      const visibilityResponse = await fetch(`https://lndfjlkzvxbnoxfuboxz.supabase.co/functions/v1/chat-settings/${agentId}?_t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      log(`Visibility check response status: ${visibilityResponse.status}`);
      
      // Check for private visibility in ALL responses
      try {
        const visibilityData = await visibilityResponse.json();
        log('Visibility data:', visibilityData);
        
        // If visibility is specifically marked as private, hide the widget
        if (visibilityData && visibilityData.visibility === 'private') {
          log('Agent is marked as PRIVATE, hiding widget');
          isPrivate = true;
          
          // Hide the chat bubble if it exists
          const existingBubble = document.getElementById('wonderwave-bubble');
          if (existingBubble) {
            existingBubble.style.display = 'none';
          }
          
          // If the chat is already open, close it
          const iframe = document.getElementById('wonderwave-iframe');
          if (iframe) {
            const container = document.getElementById('wonderwave-container');
            if (container) {
              container.style.display = 'none';
            }
          }
          
          // Don't fetch color settings if agent is private
          return null;
        }
        
        // If visibility is not private, set public and continue
        isPrivate = false;
        
        // If agent is now public (was private before), show the bubble
        const existingBubble = document.getElementById('wonderwave-bubble');
        if (existingBubble && existingBubble.style.display === 'none') {
          existingBubble.style.display = 'flex';
        }
        
        // Since we may already have the settings, use them directly
        if (!visibilityResponse.ok) {
          // If response is not OK but we've parsed it, return default settings
          return {
            bubble_color: defaultConfig.bubbleColor,
            user_message_color: defaultConfig.bubbleColor,
            sync_colors: false
          };
        }
        
        colorSettings = visibilityData;
        updateBubbleAppearance();
        
        return visibilityData;
      } catch (jsonError) {
        logError('Error parsing visibility response:', jsonError);
        // Default to private on parsing errors
        isPrivate = true;
        
        // Hide chat UI if we can't confirm it's public
        const existingBubble = document.getElementById('wonderwave-bubble');
        if (existingBubble) {
          existingBubble.style.display = 'none';
        }
        
        return null;
      }
    } catch (visibilityError) {
      logError('Error fetching visibility, defaulting to PRIVATE for safety:', visibilityError);
      // Default to private if the visibility check fails for safety
      isPrivate = true;
      
      // Hide any existing UI
      const existingBubble = document.getElementById('wonderwave-bubble');
      if (existingBubble) {
        existingBubble.style.display = 'none';
      }
      
      return null;
    }
  } catch (error) {
    logError('Error in fetchColorSettingsAndVisibility:', error);
    // Default to private on any errors
    isPrivate = true;
    
    // Hide any UI
    const existingBubble = document.getElementById('wonderwave-bubble');
    if (existingBubble) {
      existingBubble.style.display = 'none';
    }
    
    return null;
  }
}

/**
 * Get color settings
 */
export function getColorSettings() {
  return colorSettings;
}

/**
 * Set color settings
 */
export function setColorSettings(settings) {
  colorSettings = settings;
}

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
  isPrivate = privacy;
}

// Listen for messages to refresh settings
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'wonderwave-refresh-settings') {
    const agentId = event.data.agentId || window.wonderwaveConfig?.agentId;
    if (agentId) {
      log('Received refresh settings message for agent:', agentId);
      // Force re-check of agent visibility
      fetchColorSettingsAndVisibility(agentId);
    }
  }
});

// Set up an interval to regularly check agent visibility
setInterval(() => {
  const agentId = window.wonderwaveConfig?.agentId;
  if (agentId) {
    log('Periodic visibility check for agent:', agentId);
    fetchColorSettingsAndVisibility(agentId);
  }
}, 30000); // Check every 30 seconds
