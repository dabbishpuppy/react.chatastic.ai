
import { supabase } from "@/integrations/supabase/client";

export class JobStatusManager {
  /**
   * Mark job as completed
   */
  static async markJobCompleted(jobId: string, metadata?: { processingTimeMs?: number }): Promise<void> {
    const updateData: any = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add processing time to payload if provided
    if (metadata?.processingTimeMs) {
      updateData.payload = { processingTimeMs: metadata.processingTimeMs };
    }

    const { error } = await supabase
      .from('background_jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      console.error(`❌ Failed to mark job ${jobId} as completed:`, error);
    } else {
      console.log(`✅ Job ${jobId} marked as completed`);
    }
  }

  /**
   * Mark job as failed
   */
  static async markJobFailed(jobId: string, errorMessage: string): Promise<void> {
    const { error } = await supabase
      .from('background_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      console.error(`❌ Failed to mark job ${jobId} as failed:`, error);
    } else {
      console.log(`💀 Job ${jobId} marked as failed: ${errorMessage}`);
    }
  }
}
