
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { HealthReport, StalledJob } from './types.ts';

export async function handleStalledJobs(
  supabaseClient: any,
  healthReport: HealthReport
): Promise<void> {
  // Check for stalled jobs (processing too long)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: stalledJobs, error: stalledError } = await supabaseClient
    .from('background_jobs')
    .select('id, page_id, started_at')
    .eq('status', 'processing')
    .lt('started_at', fiveMinutesAgo);

  if (!stalledError && stalledJobs && stalledJobs.length > 0) {
    healthReport.healthy = false;
    healthReport.issues.push(`${stalledJobs.length} jobs processing for over 5 minutes`);
    healthReport.stalledJobs = stalledJobs.length;

    // Reset stalled jobs
    const { error: resetError } = await supabaseClient
      .from('background_jobs')
      .update({
        status: 'pending',
        started_at: null,
        error_message: 'Reset from stalled state by health monitor',
        scheduled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', stalledJobs.map((j: StalledJob) => j.id));

    if (!resetError) {
      healthReport.actions.push(`Reset ${stalledJobs.length} stalled jobs to pending`);
      console.log(`✅ Reset ${stalledJobs.length} stalled jobs`);
    }
  }
}
