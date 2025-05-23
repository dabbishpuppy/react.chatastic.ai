
import { log, logError } from './utils.js';

// Rate limiting storage keys
const RATE_LIMIT_PREFIX = 'wonderwave_rate_limit_';
const MESSAGE_TIMESTAMPS_SUFFIX = '_timestamps';

/**
 * Get rate limit storage key for an agent
 */
function getRateLimitKey(agentId) {
  return RATE_LIMIT_PREFIX + agentId + MESSAGE_TIMESTAMPS_SUFFIX;
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
    // Ensure we have an array
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
 * Check if rate limit is exceeded
 */
export function isRateLimitExceeded(agentId, rateLimitSettings) {
  if (!rateLimitSettings || !rateLimitSettings.rate_limit_enabled) {
    return { exceeded: false, remaining: null, resetTime: null };
  }
  
  const { rate_limit_messages, rate_limit_time_window } = rateLimitSettings;
  
  try {
    // Get current timestamps
    let timestamps = getMessageTimestamps(agentId);
    
    // Clean old timestamps
    timestamps = cleanOldTimestamps(timestamps, rate_limit_time_window);
    
    // Check if limit is exceeded
    const exceeded = timestamps.length >= rate_limit_messages;
    
    // Calculate remaining messages
    const remaining = Math.max(0, rate_limit_messages - timestamps.length);
    
    // Calculate reset time (when the oldest message will expire)
    let resetTime = null;
    if (timestamps.length > 0) {
      const oldestTimestamp = Math.min(...timestamps);
      resetTime = new Date(oldestTimestamp + (rate_limit_time_window * 1000));
    }
    
    // Save cleaned timestamps
    saveMessageTimestamps(agentId, timestamps);
    
    log(`Rate limit check for ${agentId}: ${timestamps.length}/${rate_limit_messages} messages in ${rate_limit_time_window}s window`);
    
    return {
      exceeded,
      remaining,
      resetTime,
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
export function recordMessage(agentId, rateLimitSettings) {
  if (!rateLimitSettings || !rateLimitSettings.rate_limit_enabled) {
    return;
  }
  
  try {
    // Get current timestamps
    let timestamps = getMessageTimestamps(agentId);
    
    // Clean old timestamps
    timestamps = cleanOldTimestamps(timestamps, rateLimitSettings.rate_limit_time_window);
    
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
  const result = isRateLimitExceeded(agentId, rateLimitSettings);
  
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
    log(`Cleared rate limit data for ${agentId}`);
  } catch (error) {
    logError('Error clearing rate limit data:', error);
  }
}
