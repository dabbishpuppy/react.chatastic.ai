
import { supabase } from "@/integrations/supabase/client";
import { AtomicJobClaiming } from './atomicJobClaiming';
import type { RecoveryResult } from './types/crawlHealthTypes';

export class RecoveryManager {
  static async triggerEnhancedRecovery(): Promise<void> {
    try {
      console.log('🔧 Triggering enhanced recovery procedures...');
      
      // 1. Trigger crawl recovery service
      const { data: recoveryData } = await supabase.functions.invoke('crawl-recovery-service');
      
      if (recoveryData?.report) {
        console.log('✅ Recovery service completed:', recoveryData.report);
      }

      // 2. Use atomic job claiming to process any stuck jobs
      const claimingStats = await AtomicJobClaiming.processJobsAtomically(
        async (job) => {
          console.log(`🔄 Processing recovered job: ${job.id}`);
          return true;
        },
        {
          maxJobs: 20,
          workerId: `recovery-${Date.now()}`,
          timeoutMs: 60000
        }
      );

      console.log('📊 Recovery job processing stats:', claimingStats);

      // 3. Trigger production queue manager
      await supabase.functions.invoke('production-queue-manager', {
        body: { recoveryMode: true, highPriority: true }
      });

      console.log('✅ Enhanced recovery procedures completed');
      
    } catch (error) {
      console.error('❌ Enhanced recovery failed:', error);
    }
  }

  static async triggerManualRecovery(): Promise<RecoveryResult> {
    try {
      await this.triggerEnhancedRecovery();
      
      return {
        success: true,
        message: 'Enhanced recovery completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
