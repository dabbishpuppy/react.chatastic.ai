
import { supabase } from "@/integrations/supabase/client";

export interface SecurityConfig {
  enableKMSEncryption: boolean;
  enableEgressIPRotation: boolean;
  maxConcurrentRequestsPerCustomer: number;
  rateLimitWindowMinutes: number;
  maxPagesPerDay: Record<string, number>; // tier -> limit
  enableRobotsRespect: boolean;
}

export interface CustomerSecurityProfile {
  customerId: string;
  tier: string;
  concurrentRequests: number;
  requestsToday: number;
  lastRequestTime: string;
  isBlocked: boolean;
  blockReason?: string;
}

export interface EgressIPPool {
  activeIPs: string[];
  rotationIntervalHours: number;
  lastRotation: string;
}

export class SecurityService {
  private static readonly DEFAULT_CONFIG: SecurityConfig = {
    enableKMSEncryption: true,
    enableEgressIPRotation: true,
    maxConcurrentRequestsPerCustomer: 100,
    rateLimitWindowMinutes: 60,
    maxPagesPerDay: {
      'basic': 100,
      'pro': 1000,
      'enterprise': 10000
    },
    enableRobotsRespect: true
  };

  private static customerProfiles = new Map<string, CustomerSecurityProfile>();
  private static egressIPPool: EgressIPPool = {
    activeIPs: [
      '192.168.1.100',
      '192.168.1.101',
      '192.168.1.102',
      '192.168.1.103'
    ],
    rotationIntervalHours: 24,
    lastRotation: new Date().toISOString()
  };

  // Initialize security service
  static async initializeSecurity(config: Partial<SecurityConfig> = {}): Promise<void> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    console.log('🔒 Initializing security service...');
    
    // Start IP rotation if enabled
    if (finalConfig.enableEgressIPRotation) {
      this.startIPRotation();
    }
    
    // Load customer profiles
    await this.loadCustomerProfiles();
    
    console.log('✅ Security service initialized');
  }

  // Validate customer request against security policies
  static async validateCustomerRequest(
    customerId: string,
    requestType: 'crawl' | 'api',
    requestCount: number = 1
  ): Promise<{
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
  }> {
    try {
      const profile = await this.getCustomerProfile(customerId);
      
      // Check if customer is blocked
      if (profile.isBlocked) {
        return {
          allowed: false,
          reason: profile.blockReason || 'Customer account is blocked'
        };
      }
      
      // Check concurrent requests limit
      if (profile.concurrentRequests >= this.DEFAULT_CONFIG.maxConcurrentRequestsPerCustomer) {
        return {
          allowed: false,
          reason: 'Too many concurrent requests',
          retryAfter: 60
        };
      }
      
      // Check daily limits
      const tierLimit = this.DEFAULT_CONFIG.maxPagesPerDay[profile.tier] || 100;
      if (profile.requestsToday + requestCount > tierLimit) {
        return {
          allowed: false,
          reason: `Daily limit exceeded (${tierLimit} pages per day for ${profile.tier} tier)`,
          retryAfter: this.getSecondsUntilMidnight()
        };
      }
      
      // Check rate limiting
      const timeSinceLastRequest = Date.now() - new Date(profile.lastRequestTime).getTime();
      const rateLimitMs = this.DEFAULT_CONFIG.rateLimitWindowMinutes * 60 * 1000;
      
      if (timeSinceLastRequest < rateLimitMs && profile.requestsToday > tierLimit * 0.8) {
        return {
          allowed: false,
          reason: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimitMs - timeSinceLastRequest) / 1000)
        };
      }
      
      return { allowed: true };
      
    } catch (error) {
      console.error('Error validating customer request:', error);
      return {
        allowed: false,
        reason: 'Security validation failed'
      };
    }
  }

  // Track customer request for rate limiting
  static async trackCustomerRequest(
    customerId: string,
    requestType: 'crawl' | 'api',
    requestCount: number = 1
  ): Promise<void> {
    try {
      const profile = await this.getCustomerProfile(customerId);
      
      // Update profile
      profile.concurrentRequests++;
      profile.requestsToday += requestCount;
      profile.lastRequestTime = new Date().toISOString();
      
      // Store updated profile
      this.customerProfiles.set(customerId, profile);
      
      // Persist to database for durability
      await this.persistCustomerProfile(profile);
      
    } catch (error) {
      console.error('Error tracking customer request:', error);
    }
  }

  // Release concurrent request slot
  static async releaseCustomerRequest(customerId: string): Promise<void> {
    try {
      const profile = this.customerProfiles.get(customerId);
      if (profile && profile.concurrentRequests > 0) {
        profile.concurrentRequests--;
        this.customerProfiles.set(customerId, profile);
        await this.persistCustomerProfile(profile);
      }
    } catch (error) {
      console.error('Error releasing customer request:', error);
    }
  }

  // Get or create customer security profile
  private static async getCustomerProfile(customerId: string): Promise<CustomerSecurityProfile> {
    // Check cache first
    let profile = this.customerProfiles.get(customerId);
    
    if (!profile) {
      // Load from database
      const { data: customerData } = await supabase
        .from('customer_usage_tracking')
        .select('*')
        .eq('customer_id', customerId)
        .single();
      
      if (customerData) {
        profile = {
          customerId,
          tier: 'basic', // Default tier, should be fetched from customer data
          concurrentRequests: customerData.concurrent_requests || 0,
          requestsToday: customerData.requests_last_day || 0,
          lastRequestTime: customerData.last_request_at || new Date().toISOString(),
          isBlocked: false
        };
      } else {
        // Create new profile
        profile = {
          customerId,
          tier: 'basic',
          concurrentRequests: 0,
          requestsToday: 0,
          lastRequestTime: new Date().toISOString(),
          isBlocked: false
        };
      }
      
      this.customerProfiles.set(customerId, profile);
    }
    
    return profile;
  }

  // Persist customer profile to database
  private static async persistCustomerProfile(profile: CustomerSecurityProfile): Promise<void> {
    try {
      const { error } = await supabase
        .from('customer_usage_tracking')
        .upsert({
          customer_id: profile.customerId,
          concurrent_requests: profile.concurrentRequests,
          requests_last_day: profile.requestsToday,
          last_request_at: profile.lastRequestTime,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error persisting customer profile:', error);
      }
    } catch (error) {
      console.error('Error persisting customer profile:', error);
    }
  }

  // Load customer profiles from database
  private static async loadCustomerProfiles(): Promise<void> {
    try {
      const { data: profiles } = await supabase
        .from('customer_usage_tracking')
        .select('*');
      
      if (profiles) {
        profiles.forEach(p => {
          this.customerProfiles.set(p.customer_id, {
            customerId: p.customer_id,
            tier: 'basic', // Should be fetched from customer tier table
            concurrentRequests: p.concurrent_requests || 0,
            requestsToday: p.requests_last_day || 0,
            lastRequestTime: p.last_request_at || new Date().toISOString(),
            isBlocked: false
          });
        });
      }
    } catch (error) {
      console.error('Error loading customer profiles:', error);
    }
  }

  // Get current egress IP for requests
  static getCurrentEgressIP(): string {
    const ips = this.egressIPPool.activeIPs;
    const index = Math.floor(Math.random() * ips.length);
    return ips[index];
  }

  // Start IP rotation process
  private static startIPRotation(): void {
    const rotationMs = this.egressIPPool.rotationIntervalHours * 60 * 60 * 1000;
    
    setInterval(() => {
      this.rotateEgressIPs();
    }, rotationMs);
    
    console.log(`🔄 IP rotation started (every ${this.egressIPPool.rotationIntervalHours} hours)`);
  }

  // Rotate egress IP addresses
  private static rotateEgressIPs(): void {
    // Simulate IP rotation by shuffling the pool
    const ips = [...this.egressIPPool.activeIPs];
    for (let i = ips.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ips[i], ips[j]] = [ips[j], ips[i]];
    }
    
    this.egressIPPool.activeIPs = ips;
    this.egressIPPool.lastRotation = new Date().toISOString();
    
    console.log('🔄 Egress IP pool rotated');
  }

  // Encrypt sensitive data using KMS
  static async encryptSensitiveData(data: string, keyId: string = 'default'): Promise<string> {
    try {
      // Use Supabase encryption function
      const { data: encryptedData, error } = await supabase
        .rpc('encrypt_sensitive_data', {
          data,
          key_id: keyId
        });
      
      if (error) {
        console.error('Encryption failed:', error);
        return data; // Return unencrypted as fallback
      }
      
      return encryptedData;
    } catch (error) {
      console.error('Encryption error:', error);
      return data;
    }
  }

  // Decrypt sensitive data using KMS
  static async decryptSensitiveData(encryptedData: string, keyId: string = 'default'): Promise<string> {
    try {
      // Use Supabase decryption function
      const { data: decryptedData, error } = await supabase
        .rpc('decrypt_sensitive_data', {
          encrypted_data: encryptedData,
          key_id: keyId
        });
      
      if (error) {
        console.error('Decryption failed:', error);
        return encryptedData; // Return as-is as fallback
      }
      
      return decryptedData;
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedData;
    }
  }

  // Check robots.txt compliance
  static async checkRobotsCompliance(url: string, userAgent: string = 'WonderWave-Bot'): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    if (!this.DEFAULT_CONFIG.enableRobotsRespect) {
      return { allowed: true };
    }
    
    try {
      const robotsUrl = new URL('/robots.txt', url).toString();
      
      const response = await fetch(robotsUrl, {
        headers: { 'User-Agent': userAgent },
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        return { allowed: true }; // No robots.txt found, allow crawling
      }
      
      const robotsText = await response.text();
      const rules = this.parseRobotsTxt(robotsText, userAgent);
      
      const urlPath = new URL(url).pathname;
      const isDisallowed = rules.disallowedPaths.some(path => 
        urlPath.startsWith(path) || this.matchesWildcard(urlPath, path)
      );
      
      if (isDisallowed) {
        return {
          allowed: false,
          reason: 'Disallowed by robots.txt'
        };
      }
      
      return { allowed: true };
      
    } catch (error) {
      console.warn('Error checking robots.txt:', error);
      return { allowed: true }; // Allow on error
    }
  }

  // Parse robots.txt content
  private static parseRobotsTxt(robotsText: string, userAgent: string): {
    disallowedPaths: string[];
    allowedPaths: string[];
  } {
    const lines = robotsText.split('\n');
    const disallowedPaths: string[] = [];
    const allowedPaths: string[] = [];
    
    let currentUserAgent = '';
    let applies = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      if (trimmed.toLowerCase().startsWith('user-agent:')) {
        currentUserAgent = trimmed.substring(11).trim();
        applies = currentUserAgent === '*' || 
                 currentUserAgent.toLowerCase() === userAgent.toLowerCase();
      } else if (applies) {
        if (trimmed.toLowerCase().startsWith('disallow:')) {
          const path = trimmed.substring(9).trim();
          if (path) disallowedPaths.push(path);
        } else if (trimmed.toLowerCase().startsWith('allow:')) {
          const path = trimmed.substring(6).trim();
          if (path) allowedPaths.push(path);
        }
      }
    }
    
    return { disallowedPaths, allowedPaths };
  }

  // Match wildcard patterns
  private static matchesWildcard(text: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(text);
  }

  // Get seconds until midnight for rate limit reset
  private static getSecondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
  }

  // Get security status for a customer
  static async getSecurityStatus(customerId: string): Promise<{
    profile: CustomerSecurityProfile;
    compliance: {
      robotsRespectEnabled: boolean;
      kmsEncryptionEnabled: boolean;
      egressIPRotationEnabled: boolean;
    };
    limits: {
      dailyLimit: number;
      concurrentLimit: number;
      rateLimitWindow: number;
    };
  }> {
    const profile = await this.getCustomerProfile(customerId);
    
    return {
      profile,
      compliance: {
        robotsRespectEnabled: this.DEFAULT_CONFIG.enableRobotsRespect,
        kmsEncryptionEnabled: this.DEFAULT_CONFIG.enableKMSEncryption,
        egressIPRotationEnabled: this.DEFAULT_CONFIG.enableEgressIPRotation
      },
      limits: {
        dailyLimit: this.DEFAULT_CONFIG.maxPagesPerDay[profile.tier] || 100,
        concurrentLimit: this.DEFAULT_CONFIG.maxConcurrentRequestsPerCustomer,
        rateLimitWindow: this.DEFAULT_CONFIG.rateLimitWindowMinutes
      }
    };
  }
}
