
/**
 * Pattern Matching Module
 * Handles glob and regex pattern matching for URL filtering
 */

/**
 * Convert glob pattern to regex
 * @param {string} pattern - Glob pattern
 * @returns {RegExp} Regex pattern
 */
function globToRegex(pattern) {
  // Escape special regex characters except * and ?
  let regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  
  // Make it case insensitive and match full string
  return new RegExp(`^${regex}$`, 'i');
}

/**
 * Check if URL matches any of the provided patterns
 * @param {string} url - URL to test
 * @param {string[]} patterns - Array of glob or regex patterns
 * @returns {boolean} True if URL matches any pattern
 */
export function matchesAny(url, patterns) {
  if (!patterns || patterns.length === 0) return false;
  
  for (const pattern of patterns) {
    if (!pattern || pattern.trim() === '') continue;
    
    try {
      // Check if pattern is already a regex (starts and ends with /)
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        const regexPattern = new RegExp(pattern.slice(1, -1), 'i');
        if (regexPattern.test(url)) return true;
      } else {
        // Treat as glob pattern
        const regex = globToRegex(pattern.trim());
        if (regex.test(url)) return true;
      }
    } catch (error) {
      console.warn(`Invalid pattern: ${pattern}`, error);
    }
  }
  
  return false;
}

/**
 * Check if URL matches include patterns (if any are specified)
 * @param {string} url - URL to test
 * @param {string[]} includePatterns - Array of include patterns
 * @returns {boolean} True if URL should be included
 */
export function matchesIncludePatterns(url, includePatterns) {
  // If no include patterns specified, include all
  if (!includePatterns || includePatterns.length === 0) return true;
  
  // Filter out empty patterns
  const validPatterns = includePatterns.filter(p => p && p.trim() !== '');
  if (validPatterns.length === 0) return true;
  
  return matchesAny(url, validPatterns);
}

/**
 * Check if URL matches exclude patterns
 * @param {string} url - URL to test
 * @param {string[]} excludePatterns - Array of exclude patterns
 * @returns {boolean} True if URL should be excluded
 */
export function matchesExcludePatterns(url, excludePatterns) {
  return matchesAny(url, excludePatterns);
}

/**
 * Parse user input patterns (newline separated)
 * @param {string} input - User input string
 * @returns {string[]} Array of patterns
 */
export function parsePatterns(input) {
  if (!input || typeof input !== 'string') return [];
  
  return input
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#')); // Remove empty lines and comments
}

/**
 * Validate a pattern for syntax errors
 * @param {string} pattern - Pattern to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validatePattern(pattern) {
  if (!pattern || pattern.trim() === '') {
    return { valid: false, error: 'Pattern cannot be empty' };
  }
  
  try {
    // If it looks like a regex, validate it
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      new RegExp(pattern.slice(1, -1), 'i');
    } else {
      // Validate as glob by converting to regex
      globToRegex(pattern);
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, error: `Invalid pattern: ${error.message}` };
  }
}

/**
 * Get pattern suggestions based on common use cases
 * @returns {Object} Object with include and exclude suggestions
 */
export function getPatternSuggestions() {
  return {
    include: [
      '/blog/*',
      '/products/*',
      '/services/*',
      '/about*',
      '/contact*'
    ],
    exclude: [
      '/admin/*',
      '/wp-admin/*',
      '/login*',
      '/signup*',
      '/dashboard/*',
      '/api/*',
      '*.json',
      '*.xml',
      '*.pdf'
    ]
  };
}
