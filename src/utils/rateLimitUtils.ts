
import { getAgentSecuritySettings } from "@/services/agentSecurityService";

// Rate limiting storage keys
const getRateLimitKey = (agentId: string) => {
  return `wonderwave_rate_limit_${agentId}_timestamps`;
};

const getRateLimitStartTimeKey = (agentId: string) => {
  return `wonderwave_rate_limit_${agentId}_start_time`;
};

// Get message timestamps from localStorage
export const getMessageTimestamps = (agentId: string) => {
  try {
    const key = getRateLimitKey(agentId);
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    
    const timestamps = JSON.parse(stored);
    return Array.isArray(timestamps) ? timestamps : [];
  } catch (error) {
    console.error('Error reading rate limit timestamps:', error);
    return [];
  }
};

// Save message timestamps to localStorage
export const saveMessageTimestamps = (agentId: string, timestamps: number[]) => {
  try {
    const key = getRateLimitKey(agentId);
    localStorage.setItem(key, JSON.stringify(timestamps));
  } catch (error) {
    console.error('Error saving rate limit timestamps:', error);
  }
};

// Get rate limit start time from localStorage
export const getRateLimitStartTime = (agentId: string) => {
  try {
    const key = getRateLimitStartTimeKey(agentId);
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored) : null;
  } catch (error) {
    console.error('Error reading rate limit start time:', error);
    return null;
  }
};

// Save rate limit start time to localStorage
export const saveRateLimitStartTime = (agentId: string, startTime: number) => {
  try {
    const key = getRateLimitStartTimeKey(agentId);
    localStorage.setItem(key, startTime.toString());
  } catch (error) {
    console.error('Error saving rate limit start time:', error);
  }
};

// Clear rate limit start time from localStorage
export const clearRateLimitStartTime = (agentId: string) => {
  try {
    const key = getRateLimitStartTimeKey(agentId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing rate limit start time:', error);
  }
};

// Clean old timestamps outside the time window
export const cleanOldTimestamps = (timestamps: number[], timeWindowSeconds: number) => {
  const now = Date.now();
  const timeWindowMs = timeWindowSeconds * 1000;
  
  return timestamps.filter(timestamp => {
    return (now - timestamp) < timeWindowMs;
  });
};

// Check if rate limit is exceeded
export const checkRateLimit = async (agentId: string) => {
  try {
    const settings = await getAgentSecuritySettings(agentId);
    
    if (!settings || !settings.rate_limit_enabled) {
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
    
    return {
      exceeded: timeUntilReset && timeUntilReset > 0,
      resetTime,
      timeUntilReset,
      message: rate_limit_message || 'Too many messages in a row',
      current: timestamps.length,
      limit: rate_limit_messages,
      timeWindow: rate_limit_time_window
    };
    
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // On error, allow the message (fail open)
    return { exceeded: false, remaining: null, resetTime: null };
  }
};

// Record a new message timestamp
export const recordMessage = async (agentId: string) => {
  try {
    const settings = await getAgentSecuritySettings(agentId);
    
    if (!settings || !settings.rate_limit_enabled) {
      return;
    }
    
    // Get current timestamps
    let timestamps = getMessageTimestamps(agentId);
    
    // Clean old timestamps
    timestamps = cleanOldTimestamps(timestamps, settings.rate_limit_time_window);
    
    // Add new timestamp
    timestamps.push(Date.now());
    
    // Save updated timestamps
    saveMessageTimestamps(agentId, timestamps);
    
  } catch (error) {
    console.error('Error recording message timestamp:', error);
  }
};
