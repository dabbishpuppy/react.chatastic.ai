
import { log, logError } from './utils.js';
import { checkRateLimit, recordMessage } from './rateLimit.js';

// Store current rate limit settings
let currentRateLimitSettings = null;

/**
 * Set rate limit settings from the server
 */
export function setRateLimitSettings(settings) {
  currentRateLimitSettings = settings;
  log('Rate limit settings updated:', settings);
}

/**
 * Check if a message can be sent (rate limit check)
 */
export async function canSendMessage() {
  const config = window.wonderwaveConfig;
  if (!config || !config.agentId) {
    return { allowed: true };
  }
  
  try {
    const rateLimitResult = await checkRateLimit(config.agentId);
    
    if (rateLimitResult.exceeded) {
      return {
        allowed: false,
        message: rateLimitResult.message,
        resetTime: rateLimitResult.resetTime,
        timeUntilReset: rateLimitResult.timeUntilReset
      };
    }
    
    return { allowed: true, remaining: rateLimitResult.current };
  } catch (error) {
    logError('Error checking rate limit:', error);
    return { allowed: true }; // Fail open
  }
}

/**
 * Show rate limit error message in the chat
 */
export function showRateLimitError(errorInfo, iframe) {
  if (!iframe) return;
  
  try {
    const message = {
      type: 'rate-limit-error',
      message: errorInfo.message,
      timeUntilReset: errorInfo.timeUntilReset
    };
    
    iframe.contentWindow.postMessage(message, '*');
    log('Sent rate limit error to iframe:', message);
  } catch (error) {
    logError('Error sending rate limit message to iframe:', error);
  }
}

/**
 * Handle message sending with rate limiting
 */
export async function handleMessageSend(messageData, iframe) {
  const config = window.wonderwaveConfig;
  if (!config || !config.agentId) {
    log('No config or agentId available for rate limiting');
    return;
  }
  
  log('Checking rate limit for message:', messageData);
  
  // Check rate limit
  const rateLimitResult = await canSendMessage();
  log('Rate limit check result:', rateLimitResult);
  
  if (!rateLimitResult.allowed) {
    // Show rate limit error
    log('Rate limit exceeded, showing error');
    showRateLimitError(rateLimitResult, iframe);
    return;
  }
  
  // Record the message timestamp
  try {
    log('Recording message for rate limiting');
    await recordMessage(config.agentId);
  } catch (error) {
    logError('Error recording message:', error);
  }
  
  // Allow the message to be sent immediately
  try {
    const allowMessage = {
      type: 'message-allowed',
      originalMessage: messageData
    };
    iframe.contentWindow.postMessage(allowMessage, '*');
    log('Sent message-allowed to iframe:', allowMessage);
  } catch (error) {
    logError('Error sending message allowed confirmation:', error);
  }
}
