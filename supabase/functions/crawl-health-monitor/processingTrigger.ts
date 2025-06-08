
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { HealthReport } from './types.ts';

export async function triggerProcessingIfNeeded(
  supabaseClient: any,
  healthReport: HealthReport
): Promise<void> {
  // Trigger processing if we fixed issues
  if (healthReport.actions.length > 0) {
    try {
      const { error: triggerError } = await supabaseClient.functions.invoke('production-queue-manager', {
        body: { healthRecovery: true, priority: 'high' }
      });

      if (!triggerError) {
        healthReport.actions.push('Triggered queue processing for recovered jobs');
      }
    } catch (error) {
      console.error('Failed to trigger processing:', error);
    }
  }
}
