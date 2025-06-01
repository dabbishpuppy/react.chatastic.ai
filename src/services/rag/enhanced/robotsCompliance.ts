
export interface RobotsRule {
  userAgent: string;
  disallowed: string[];
  allowed: string[];
  crawlDelay?: number;
  sitemap?: string[];
}

export interface RobotsCheckResult {
  allowed: boolean;
  reason?: string;
  crawlDelay?: number;
  matchedRule?: string;
}

export class RobotsComplianceChecker {
  private static robotsCache = new Map<string, { rules: RobotsRule[]; expires: number }>();
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly USER_AGENT = 'WonderWave-Bot';

  // Check if a URL is allowed by robots.txt
  static async checkUrlAllowed(url: string, respectRobots: boolean = true): Promise<RobotsCheckResult> {
    if (!respectRobots) {
      return { allowed: true, reason: 'Robots.txt compliance disabled' };
    }

    try {
      const urlObj = new URL(url);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      const path = urlObj.pathname + urlObj.search;

      // Get robots.txt rules
      const rules = await this.getRobotsRules(baseUrl);
      
      if (!rules || rules.length === 0) {
        return { allowed: true, reason: 'No robots.txt found or no applicable rules' };
      }

      // Find the most specific rule that applies to our user agent
      const applicableRule = this.findApplicableRule(rules, this.USER_AGENT);
      
      if (!applicableRule) {
        return { allowed: true, reason: 'No applicable robots.txt rules' };
      }

      // Check if path is explicitly allowed
      for (const allowedPath of applicableRule.allowed) {
        if (this.pathMatches(path, allowedPath)) {
          return { 
            allowed: true, 
            reason: `Explicitly allowed by rule: Allow: ${allowedPath}`,
            crawlDelay: applicableRule.crawlDelay
          };
        }
      }

      // Check if path is disallowed
      for (const disallowedPath of applicableRule.disallowed) {
        if (this.pathMatches(path, disallowedPath)) {
          return { 
            allowed: false, 
            reason: `Disallowed by robots.txt rule: Disallow: ${disallowedPath}`,
            matchedRule: disallowedPath
          };
        }
      }

      // No specific rules matched, default to allowed
      return { 
        allowed: true, 
        reason: 'No matching disallow rules',
        crawlDelay: applicableRule.crawlDelay
      };

    } catch (error) {
      console.warn('Error checking robots.txt:', error);
      // Fail open - allow crawling if robots.txt check fails
      return { allowed: true, reason: 'Robots.txt check failed, defaulting to allowed' };
    }
  }

  // Get and parse robots.txt rules
  private static async getRobotsRules(baseUrl: string): Promise<RobotsRule[]> {
    // Check cache first
    const cached = this.robotsCache.get(baseUrl);
    if (cached && Date.now() < cached.expires) {
      return cached.rules;
    }

    try {
      const robotsUrl = `${baseUrl}/robots.txt`;
      console.log(`📋 Fetching robots.txt from: ${robotsUrl}`);

      const response = await fetch(robotsUrl, {
        headers: {
          'User-Agent': `${this.USER_AGENT}/2.0 (+https://wonderwave.no/bot)`
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        console.log(`No robots.txt found at ${robotsUrl} (${response.status})`);
        return [];
      }

      const robotsText = await response.text();
      const rules = this.parseRobotsText(robotsText);

      // Cache the results
      this.robotsCache.set(baseUrl, {
        rules,
        expires: Date.now() + this.CACHE_DURATION
      });

      console.log(`✅ Parsed ${rules.length} robots.txt rules from ${robotsUrl}`);
      return rules;

    } catch (error) {
      console.warn(`Failed to fetch robots.txt from ${baseUrl}:`, error);
      return [];
    }
  }

  // Parse robots.txt content
  private static parseRobotsText(text: string): RobotsRule[] {
    const lines = text.split('\n').map(line => line.trim());
    const rules: RobotsRule[] = [];
    let currentRule: Partial<RobotsRule> | null = null;

    for (const line of lines) {
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) {
        continue;
      }

      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) {
        continue;
      }

      const directive = line.substring(0, colonIndex).trim().toLowerCase();
      const value = line.substring(colonIndex + 1).trim();

      switch (directive) {
        case 'user-agent':
          // Start a new rule
          if (currentRule) {
            rules.push(this.finalizeRule(currentRule));
          }
          currentRule = {
            userAgent: value.toLowerCase(),
            disallowed: [],
            allowed: [],
            sitemap: []
          };
          break;

        case 'disallow':
          if (currentRule && value) {
            currentRule.disallowed!.push(value);
          }
          break;

        case 'allow':
          if (currentRule && value) {
            currentRule.allowed!.push(value);
          }
          break;

        case 'crawl-delay':
          if (currentRule) {
            const delay = parseInt(value);
            if (!isNaN(delay)) {
              currentRule.crawlDelay = delay * 1000; // Convert to milliseconds
            }
          }
          break;

        case 'sitemap':
          if (currentRule && value) {
            currentRule.sitemap!.push(value);
          }
          break;
      }
    }

    // Add the last rule
    if (currentRule) {
      rules.push(this.finalizeRule(currentRule));
    }

    return rules;
  }

  // Finalize a rule by ensuring all required fields are present
  private static finalizeRule(rule: Partial<RobotsRule>): RobotsRule {
    return {
      userAgent: rule.userAgent || '*',
      disallowed: rule.disallowed || [],
      allowed: rule.allowed || [],
      crawlDelay: rule.crawlDelay,
      sitemap: rule.sitemap || []
    };
  }

  // Find the most applicable rule for a user agent
  private static findApplicableRule(rules: RobotsRule[], userAgent: string): RobotsRule | null {
    const normalizedUA = userAgent.toLowerCase();

    // First, look for exact match
    for (const rule of rules) {
      if (rule.userAgent === normalizedUA) {
        return rule;
      }
    }

    // Then, look for partial match
    for (const rule of rules) {
      if (rule.userAgent !== '*' && normalizedUA.includes(rule.userAgent)) {
        return rule;
      }
    }

    // Finally, look for wildcard rule
    for (const rule of rules) {
      if (rule.userAgent === '*') {
        return rule;
      }
    }

    return null;
  }

  // Check if a path matches a robots.txt pattern
  private static pathMatches(path: string, pattern: string): boolean {
    // Handle empty pattern
    if (!pattern) {
      return false;
    }

    // Handle exact match
    if (pattern === path) {
      return true;
    }

    // Handle wildcard patterns
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return path.startsWith(prefix);
    }

    // Handle prefix match
    if (pattern.endsWith('/')) {
      return path.startsWith(pattern);
    }

    // Handle directory match
    return path.startsWith(pattern) && (path.length === pattern.length || path[pattern.length] === '/');
  }

  // Get sitemap URLs from robots.txt
  static async getSitemapUrls(baseUrl: string): Promise<string[]> {
    const rules = await this.getRobotsRules(baseUrl);
    const sitemaps = new Set<string>();

    for (const rule of rules) {
      for (const sitemap of rule.sitemap || []) {
        sitemaps.add(sitemap);
      }
    }

    return Array.from(sitemaps);
  }

  // Get recommended crawl delay
  static async getCrawlDelay(url: string): Promise<number> {
    try {
      const urlObj = new URL(url);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      const rules = await this.getRobotsRules(baseUrl);
      
      const applicableRule = this.findApplicableRule(rules, this.USER_AGENT);
      return applicableRule?.crawlDelay || 1000; // Default 1 second
    } catch (error) {
      return 1000; // Default delay on error
    }
  }

  // Clear robots.txt cache (useful for testing)
  static clearCache(): void {
    this.robotsCache.clear();
  }

  // Get cache statistics
  static getCacheStats(): { size: number; entries: Array<{ baseUrl: string; expires: string }> } {
    const entries = Array.from(this.robotsCache.entries()).map(([baseUrl, data]) => ({
      baseUrl,
      expires: new Date(data.expires).toISOString()
    }));

    return {
      size: this.robotsCache.size,
      entries
    };
  }
}
