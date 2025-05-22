
// Debug mode flag
let debugMode = false;

/**
 * Simple logging function that only logs when debug mode is enabled
 */
export function log(...args) {
  if (debugMode || (window.wonderwaveConfig && window.wonderwaveConfig.debug)) {
    console.log('[WonderWave]', ...args);
  }
}

/**
 * Log errors always to help with debugging
 */
export function logError(...args) {
  console.error('[WonderWave Error]', ...args);
}

/**
 * Set debug mode
 */
export function setDebugMode(isDebug) {
  debugMode = isDebug === true;
  log('Debug mode set to:', debugMode);
  return debugMode;
}

/**
 * Get debug mode
 */
export function getDebugMode() {
  return debugMode;
}

/**
 * Default configuration
 */
export const defaultConfig = {
  position: 'right',
  bubbleColor: '#3B82F6', // Blue
  bubbleSize: '60px',
  zIndex: 999999,
  cdnDomain: 'query-spark-start.lovable.app',
};
