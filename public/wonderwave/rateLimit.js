
import { log, logError } from './utils.js';

// Rate limiting storage keys
const RATE_LIMIT_PREFIX = 'wonderwave_rate_limit_';
const MESSAGE_TIMESTAMPS_SUFFIX = '_timestamps';
const START_TIME_SUFFIX = '_start_time';

/**
 * Get rate limit storage key for an agent
 */
function getRateLimitKey(agentId) {
  return RATE_LIMIT_PREFIX + agentId + MESSAGE_TIMESTAMPS_SUFFIX;
}

/**
 * Get rate limit start time key
 */
function getRateLimitStartTimeKey(agentId) {
  return RATE_LIMIT_PREFIX + agentId + START_TIME_SUFFIX;
}

/**
 * Get message timestamps from localStorage
 */
function getMessageTimestamps(agentId) {
  try {
    const key = getRateLimitKey(agentId);
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    
    const timestamps = JSON.parse(stored);
    return Array.isArray(timestamps) ? timestamps : [];
  } catch (error) {
    logError('Error reading rate limit timestamps:', error);
    return [];
  }
}

/**
 * Save message timestamps to localStorage
 */
function saveMessageTimestamps(agentId, timestamps) {
  try {
    const key = getRateLimitKey(agentId);
    localStorage.setItem(key, JSON.stringify(timestamps));
  } catch (error) {
    logError('Error saving rate limit timestamps:', error);
  }
}

/**
 * Get rate limit start time from localStorage
 */
function getRateLimitStartTime(agentId) {
  try {
    const key = getRateLimitStartTimeKey(agentId);
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored) : null;
  } catch (error) {
    logError('Error reading rate limit start time:', error);
    return null;
  }
}

/**
 * Save rate limit start time to localStorage
 */
function saveRateLimitStartTime(agentId, startTime) {
  try {
    const key = getRateLimitStartTimeKey(agentId);
    localStorage.setItem(key, startTime.toString());
  } catch (error) {
    logError('Error saving rate limit start time:', error);
  }
}

/**
 * Clear rate limit start time from localStorage
 */
function clearRateLimitStartTime(agentId) {
  try {
    const key = getRateLimitStartTimeKey(agentId);
    localStorage.removeItem(key);
  } catch (error) {
    logError('Error clearing rate limit start time:', error);
  }
}

/**
 * Clean old timestamps outside the time window
 */
function cleanOldTimestamps(timestamps, timeWindowSeconds) {
  const now = Date.now();
  const timeWindowMs = timeWindowSeconds * 1000;
  
  return timestamps.filter(timestamp => {
    return (now - timestamp) < timeWindowMs;
  });
}

/**
 * Fetch rate limit settings
 */
async function fetchRateLimitSettings(agentId) {
  try {
    const response = await fetch(`https://lndfjlkzvxbnoxfuboxz.supabase.co/functions/v1/chat-settings?agentId=${agentId}`);
    const data = await response.json();
    
    return {
      rate_limit_enabled: data.rate_limit_enabled || false,
      rate_limit_messages: data.rate_limit_messages || 20,
      rate_limit_time_window: data.rate_limit_time_window || 240,
      rate_limit_message: data.rate_limit_message || 'Too many messages in a row'
    };
  } catch (error) {
    logError('Error fetching rate limit settings:', error);
    return {
      rate_limit_enabled: false,
      rate_limit_messages: 20,
      rate_limit_time_window: 240,
      rate_limit_message: 'Too many messages in a row'
    };
  }
}

/**
 * Check if rate limit is exceeded
 */
export async function checkRateLimit(agentId) {
  try {
    const settings = await fetchRateLimitSettings(agentId);
    
    if (!settings.rate_limit_enabled) {
      return { exceeded: false, remaining: null, resetTime: null };
    }

    const { rate_limit_messages, rate_limit_time_window, rate_limit_message } = settings;
    
    // Get current timestamps
    let timestamps = getMessageTimestamps(agentId);
    
    // Clean old timestamps
    timestamps = cleanOldTimestamps(timestamps, rate_limit_time_window);
    
    // Check if limit is exceeded
    const exceeded = timestamps.length >= rate_limit_messages;
    
    // Calculate reset time and timeUntilReset
    let resetTime = null;
    let timeUntilReset = null;
    
    if (exceeded) {
      // Check if we already have a start time
      const existingStartTime = getRateLimitStartTime(agentId);
      const now = Date.now();
      
      if (existingStartTime) {
        // Calculate remaining time from existing start time
        const elapsedSeconds = Math.floor((now - existingStartTime) / 1000);
        timeUntilReset = Math.max(0, rate_limit_time_window - elapsedSeconds);
        
        if (timeUntilReset <= 0) {
          // Time window has expired, clear start time
          clearRateLimitStartTime(agentId);
          timeUntilReset = null;
        } else {
          resetTime = new Date(existingStartTime + (rate_limit_time_window * 1000));
        }
      } else {
        // First time hitting rate limit, set start time
        saveRateLimitStartTime(agentId, now);
        timeUntilReset = rate_limit_time_window;
        resetTime = new Date(now + (rate_limit_time_window * 1000));
      }
    } else {
      // Not exceeded, clear any existing start time
      clearRateLimitStartTime(agentId);
    }
    
    // Save cleaned timestamps
    saveMessageTimestamps(agentId, timestamps);
    
    log(`Rate limit check for ${agentId}: ${timestamps.length}/${rate_limit_messages} messages in ${rate_limit_time_window}s window`);
    
    return {
      exceeded: timeUntilReset && timeUntilReset > 0,
      resetTime,
      timeUntilReset,
      message: rate_limit_message,
      current: timestamps.length,
      limit: rate_limit_messages,
      timeWindow: rate_limit_time_window
    };
    
  } catch (error) {
    logError('Error checking rate limit:', error);
    // On error, allow the message (fail open)
    return { exceeded: false, remaining: null, resetTime: null };
  }
}

/**
 * Record a new message timestamp
 */
export function recordMessage(agentId) {
  try {
    // Get current timestamps
    let timestamps = getMessageTimestamps(agentId);
    
    // Add new timestamp
    timestamps.push(Date.now());
    
    // Save updated timestamps
    saveMessageTimestamps(agentId, timestamps);
    
    log(`Recorded new message for ${agentId}. Total: ${timestamps.length}`);
    
  } catch (error) {
    logError('Error recording message timestamp:', error);
  }
}

/**
 * Get rate limit status for display
 */
export function getRateLimitStatus(agentId, rateLimitSettings) {
  const result = checkRateLimit(agentId, rateLimitSettings);
  
  if (!rateLimitSettings || !rateLimitSettings.rate_limit_enabled) {
    return null;
  }
  
  const timeUntilReset = result.resetTime ? Math.max(0, Math.ceil((result.resetTime.getTime() - Date.now()) / 1000)) : null;
  
  return {
    ...result,
    timeUntilReset,
    message: rateLimitSettings.rate_limit_message || 'Too many messages in a row'
  };
}

/**
 * Clear rate limit data for an agent (useful for testing or admin reset)
 */
export function clearRateLimit(agentId) {
  try {
    const key = getRateLimitKey(agentId);
    localStorage.removeItem(key);
    const startTimeKey = getRateLimitStartTimeKey(agentId);
    localStorage.removeItem(startTimeKey);
    log(`Cleared rate limit data for ${agentId}`);
  } catch (error) {
    logError('Error clearing rate limit data:', error);
  }
}
