
import { log, logError, defaultConfig } from './utils.js';
import { updateBubbleAppearance } from './ui.js';

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
      const visibilityResponse = await fetch(`https://lndfjlkzvxbnoxfuboxz.supabase.co/functions/v1/chat-settings/${agentId}?_t=${timestamp}`);
      
      if (!visibilityResponse.ok) {
        log(`Agent visibility check returned status: ${visibilityResponse.status}`);
        // Don't throw, continue with public visibility as fallback
      } else {
        // Check if response is JSON before parsing
        const contentType = visibilityResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          log(`Expected JSON response for visibility but got: ${contentType}`);
          // Continue with default public visibility
        } else {
          try {
            const visibilityData = await visibilityResponse.json();
            log('Fetched visibility data:', visibilityData);
            
            // Update the private flag if "visibility" property exists
            if (visibilityData && visibilityData.visibility === 'private') {
              isPrivate = true;
              
              // If private, hide the chat bubble if it exists
              const bubbleButton = document.getElementById('wonderwave-bubble');
              if (bubbleButton) {
                bubbleButton.style.display = 'none';
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
            } else {
              isPrivate = false;
              
              // If agent is now public (was private before), show the bubble
              const bubbleButton = document.getElementById('wonderwave-bubble');
              if (bubbleButton) {
                bubbleButton.style.display = 'flex';
              }
              
              // Since we already have the settings from the visibility check,
              // we can use them directly
              colorSettings = visibilityData;
              
              // Update existing bubble if it exists
              const bubbleButton = document.getElementById('wonderwave-bubble');
              if (bubbleButton) {
                updateBubbleAppearance();
              }
              
              return visibilityData;
            }
          } catch (jsonError) {
            logError('Error parsing visibility JSON:', jsonError);
            // Continue with default public visibility
          }
        }
      }
    } catch (visibilityError) {
      logError('Error fetching visibility, defaulting to public:', visibilityError);
      // Default to public if the visibility check fails
      isPrivate = false;
    }
    
    // If we reach here, it means we need to get the settings again or the visibility check failed
    try {
      // Add timestamp to URL to prevent caching issues
      const timestamp = new Date().getTime();
      const response = await fetch(`https://lndfjlkzvxbnoxfuboxz.supabase.co/functions/v1/chat-settings/${agentId}?_t=${timestamp}`);
      
      if (!response.ok) {
        log(`Chat settings fetch returned status: ${response.status}`);
        // Return default settings but don't throw
        return {
          bubble_color: defaultConfig.bubbleColor,
          user_message_color: defaultConfig.bubbleColor,
          sync_colors: false
        };
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        logError('Expected JSON response but got:', contentType);
        // Return default settings instead of null
        return {
          bubble_color: defaultConfig.bubbleColor,
          user_message_color: defaultConfig.bubbleColor,
          sync_colors: false
        };
      }
      
      try {
        const data = await response.json();
        log('Fetched color settings:', data);
        
        // Update the stored color settings
        colorSettings = data;
        
        // Update existing bubble if it exists
        const bubbleButton = document.getElementById('wonderwave-bubble');
        if (bubbleButton) {
          updateBubbleAppearance();
        }
        
        return data;
      } catch (jsonError) {
        logError('Error parsing settings JSON:', jsonError);
        // Return default settings
        return {
          bubble_color: defaultConfig.bubbleColor,
          user_message_color: defaultConfig.bubbleColor,
          sync_colors: false
        };
      }
    } catch (settingsError) {
      logError('Error fetching settings:', settingsError);
      return {
        bubble_color: defaultConfig.bubbleColor,
        user_message_color: defaultConfig.bubbleColor,
        sync_colors: false
      };
    }
  } catch (error) {
    logError('Error in fetchColorSettingsAndVisibility:', error);
    return {
      bubble_color: defaultConfig.bubbleColor,
      user_message_color: defaultConfig.bubbleColor,
      sync_colors: false
    };
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
