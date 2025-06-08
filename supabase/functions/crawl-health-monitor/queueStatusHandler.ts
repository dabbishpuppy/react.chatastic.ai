
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { HealthReport } from './types.ts';

export async function handleQueueStatus(
  supabaseClient: any,
  healthReport: HealthReport
): Promise<void> {
  // Check queue status
  const { data: queueStats } = await supabaseClient
    .from('background_jobs')
    .select('status')
    .in('status', ['pending', 'processing']);

  const pendingJobs = queueStats?.filter((j: any) => j.status === 'pending').length || 0;
  const processingJobs = queueStats?.filter((j: any) => j.status === 'processing').length || 0;

  if (pendingJobs > 500) {
    healthReport.healthy = false;
    healthReport.issues.push(`High queue backlog: ${pendingJobs} pending jobs`);
    healthReport.queueStatus = 'overloaded';
  } else if (pendingJobs > 100) {
    healthReport.queueStatus = 'busy';
  } else {
    healthReport.queueStatus = 'normal';
  }
}
