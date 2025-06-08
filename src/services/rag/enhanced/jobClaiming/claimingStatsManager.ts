
import { supabase } from "@/integrations/supabase/client";
import type { ClaimingStats } from '../types/jobClaimingTypes';

export class ClaimingStatsManager {
  private static claimingStats: ClaimingStats = {
    totalClaims: 0,
    successfulClaims: 0,
    failedClaims: 0,
    conflictedClaims: 0,
    avgClaimTime: 0,
    conflictRate: 0,
    pendingJobs: 0,
    processingJobs: 0,
    completedJobs: 0,
    failedJobs: 0
  };

  /**
   * Update claiming timing statistics
   */
  static updateClaimTiming(claimTime: number): void {
    const totalClaims = this.claimingStats.totalClaims;
    const currentAvg = this.claimingStats.avgClaimTime;
    
    this.claimingStats.avgClaimTime = ((currentAvg * (totalClaims - 1)) + claimTime) / totalClaims;
    this.claimingStats.conflictRate = this.claimingStats.conflictedClaims / totalClaims;
  }

  static incrementTotalClaims(): void {
    this.claimingStats.totalClaims++;
  }

  static incrementSuccessfulClaims(): void {
    this.claimingStats.successfulClaims++;
  }

  static incrementFailedClaims(): void {
    this.claimingStats.failedClaims++;
  }

  static incrementConflictedClaims(): void {
    this.claimingStats.conflictedClaims++;
  }

  /**
   * Get current claiming statistics
   */
  static async getClaimingStats(): Promise<ClaimingStats> {
    try {
      // Update job counts from database
      const { data: jobCounts } = await supabase
        .from('background_jobs')
        .select('status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (jobCounts) {
        this.claimingStats.pendingJobs = jobCounts.filter(j => j.status === 'pending').length;
        this.claimingStats.processingJobs = jobCounts.filter(j => j.status === 'processing').length;
        this.claimingStats.completedJobs = jobCounts.filter(j => j.status === 'completed').length;
        this.claimingStats.failedJobs = jobCounts.filter(j => j.status === 'failed').length;
      }

      return { ...this.claimingStats };
    } catch (error) {
      console.error('❌ Error getting claiming stats:', error);
      return { ...this.claimingStats };
    }
  }

  /**
   * Reset statistics (useful for testing or monitoring resets)
   */
  static resetStats(): void {
    this.claimingStats = {
      totalClaims: 0,
      successfulClaims: 0,
      failedClaims: 0,
      conflictedClaims: 0,
      avgClaimTime: 0,
      conflictRate: 0,
      pendingJobs: 0,
      processingJobs: 0,
      completedJobs: 0,
      failedJobs: 0
    };
  }
}
