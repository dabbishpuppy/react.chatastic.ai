
import { supabase } from '@/integrations/supabase/client';

export interface RateLimitConfig {
  domain: string;
  maxConcurrent: number;
  requestsPerSecond: number;
  burstLimit: number;
  respectRobotsTxt: boolean;
}

export interface DomainLock {
  domain: string;
  lockId: string;
  workerId: string;
  acquiredAt: string;
  expiresAt: string;
}

export class DomainRateLimiter {
  private static readonly DEFAULT_CONCURRENT = 2;
  private static readonly DEFAULT_RPS = 1;
  private static readonly LOCK_TIMEOUT_MS = 30000; // 30 seconds
  private static readonly WORKER_ID = `worker-${Math.random().toString(36).substr(2, 9)}`;

  /**
   * Acquire a rate limit lock for a domain (simplified for existing DB)
   */
  static async acquireDomainLock(domain: string): Promise<DomainLock | null> {
    const lockId = `lock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + this.LOCK_TIMEOUT_MS).toISOString();
    
    console.log(`🔒 Attempting to acquire lock for domain: ${domain}`);

    try {
      // Use metadata field in agent_sources to track domain locks
      const { data: existingLocks, error: queryError } = await supabase
        .from('agent_sources')
        .select('metadata')
        .like('metadata->domain_lock->domain', domain)
        .gt('metadata->domain_lock->expires_at', new Date().toISOString())
        .limit(this.DEFAULT_CONCURRENT);

      if (queryError) {
        console.error('❌ Failed to check existing locks:', queryError);
        return null;
      }

      const activeLocks = existingLocks?.length || 0;
      if (activeLocks >= this.DEFAULT_CONCURRENT) {
        console.log(`⏳ Domain ${domain} is rate limited, lock not acquired`);
        return null;
      }

      // Create a temporary lock record using background_jobs table
      const { data, error } = await supabase
        .from('background_jobs')
        .insert({
          job_type: 'domain_lock',
          source_id: lockId, // Use as lock identifier
          payload: {
            domain,
            lockId,
            workerId: this.WORKER_ID,
            expiresAt
          },
          scheduled_at: expiresAt // Use for expiration
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to acquire domain lock:', error);
        return null;
      }

      console.log(`✅ Acquired lock for domain: ${domain}, lockId: ${lockId}`);
      return {
        domain,
        lockId,
        workerId: this.WORKER_ID,
        acquiredAt: new Date().toISOString(),
        expiresAt
      };

    } catch (error) {
      console.error('❌ Error acquiring domain lock:', error);
      return null;
    }
  }

  /**
   * Release a domain lock
   */
  static async releaseDomainLock(lock: DomainLock): Promise<boolean> {
    console.log(`🔓 Releasing lock for domain: ${lock.domain}, lockId: ${lock.lockId}`);

    try {
      const { error } = await supabase
        .from('background_jobs')
        .delete()
        .eq('source_id', lock.lockId)
        .eq('job_type', 'domain_lock');

      if (error) {
        console.error('❌ Failed to release domain lock:', error);
        return false;
      }

      console.log(`✅ Released lock for domain: ${lock.domain}`);
      return true;

    } catch (error) {
      console.error('❌ Error releasing domain lock:', error);
      return false;
    }
  }

  /**
   * Check if domain can accept new requests
   */
  static async checkDomainAvailability(domain: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('background_jobs')
        .select('id')
        .eq('job_type', 'domain_lock')
        .like('payload->domain', domain)
        .gt('scheduled_at', new Date().toISOString());

      if (error) {
        console.error('❌ Failed to check domain availability:', error);
        return false;
      }

      const activeLocks = data?.length || 0;
      return activeLocks < this.DEFAULT_CONCURRENT;

    } catch (error) {
      console.error('❌ Error checking domain availability:', error);
      return false;
    }
  }

  /**
   * Get rate limit configuration for a domain
   */
  static async getRateLimitConfig(domain: string): Promise<RateLimitConfig> {
    // For now, return default config. In production, this would come from a database
    return {
      domain,
      maxConcurrent: this.DEFAULT_CONCURRENT,
      requestsPerSecond: this.DEFAULT_RPS,
      burstLimit: 5,
      respectRobotsTxt: true
    };
  }

  /**
   * Wait for rate limit before making request
   */
  static async waitForRateLimit(domain: string): Promise<void> {
    const config = await this.getRateLimitConfig(domain);
    const waitTime = 1000 / config.requestsPerSecond;
    
    console.log(`⏱️ Rate limiting ${domain}: waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  /**
   * Cleanup expired locks (should be run periodically)
   */
  static async cleanupExpiredLocks(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('background_jobs')
        .delete()
        .eq('job_type', 'domain_lock')
        .lt('scheduled_at', new Date().toISOString())
        .select('id');

      if (error) {
        console.error('❌ Failed to cleanup expired locks:', error);
        return 0;
      }

      const cleanedCount = data?.length || 0;
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired domain locks`);
      }

      return cleanedCount;

    } catch (error) {
      console.error('❌ Error cleaning up expired locks:', error);
      return 0;
    }
  }
}
