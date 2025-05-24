
import { log } from './utils.js';

let rateLimitCountdown = null;
let rateLimitCountdownInterval = null;

export function startRateLimitCountdown(timeUntilReset, message) {
  // Clear any existing countdown
  if (rateLimitCountdownInterval) {
    clearInterval(rateLimitCountdownInterval);
  }
  
  rateLimitCountdown = timeUntilReset;
  
  // Show initial error message
  showRateLimitError(message, rateLimitCountdown);
  
  rateLimitCountdownInterval = setInterval(() => {
    rateLimitCountdown--;
    
    if (rateLimitCountdown <= 0) {
      clearInterval(rateLimitCountdownInterval);
      rateLimitCountdownInterval = null;
      rateLimitCountdown = null;
      hideRateLimitError();
    } else {
      updateRateLimitError(message, rateLimitCountdown);
    }
  }, 1000);
}

function showRateLimitError(message, countdown) {
  // Implementation would depend on your UI framework
  // This is a placeholder for showing the error in the chat bubble
  log(`Rate limit error: ${message}. Try again in ${countdown} seconds.`);
}

function updateRateLimitError(message, countdown) {
  // Implementation would depend on your UI framework
  // This is a placeholder for updating the countdown display
  log(`Rate limit countdown: ${countdown} seconds remaining.`);
}

function hideRateLimitError() {
  // Implementation would depend on your UI framework
  // This is a placeholder for hiding the error message
  log('Rate limit error cleared.');
}

export function clearRateLimitCountdown() {
  // Clear rate limit countdown interval
  if (rateLimitCountdownInterval) {
    clearInterval(rateLimitCountdownInterval);
    rateLimitCountdownInterval = null;
  }
}
