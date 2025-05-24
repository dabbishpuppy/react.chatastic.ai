
import { log, logError, setDebugMode, defaultConfig } from './utils.js';
import { fetchColorSettingsAndVisibility, isAgentPrivate, shouldCheckVisibility } from './settings.js';
import { createBubbleButton, showPopups, setBubbleButton } from './ui.js';
import { openChat, closeChat, toggleChat, destroy as destroyChat, setIframe } from './chat.js';
import { checkRateLimit, recordMessage } from './rateLimit.js';
import { processQueue, handleCommand } from './commandHandler.js';
import { init, destroy, isInitialized } from './initialization.js';
import { startRateLimitCountdown, clearRateLimitCountdown } from './rateLimitHandler.js';

// Export the main functions that are used by other modules
export { processQueue, handleCommand, init, destroy, isInitialized, checkRateLimit, recordMessage };

// Export rate limiting functions for backward compatibility
export { startRateLimitCountdown, clearRateLimitCountdown };
