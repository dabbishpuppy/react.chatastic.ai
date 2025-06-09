
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { HealthReport } from './types.ts';

export async function handleStalledJobs(
  supabaseClient: any,
  healthReport: HealthReport
): Promise<void> {
  try {
    console.log('🔍 Checking for stalled background jobs...');

    // Check for jobs that have been processing for too long (5+ minutes)
    const stalledThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: stalledJobs, error: stalledError } = await supabaseClient
      .from('background_jobs')
      .select('id, job_type, source_id, started_at')
      .eq('status', 'processing')
      .lt('started_at', stalledThreshold);

    if (stalledError) {
      console.error('❌ Error checking stalled jobs:', stalledError);
      healthReport.issues.push(`Failed to check stalled jobs: ${stalledError.message}`);
      return;
    }

    healthReport.stalledJobs = stalledJobs?.length || 0;

    if (stalledJobs && stalledJobs.length > 0) {
      console.log(`⚠️ Found ${stalledJobs.length} stalled jobs, resetting them...`);
      
      // Reset stalled jobs back to pending
      const { error: resetError } = await supabaseClient
        .from('background_jobs')
        .update({
          status: 'pending',
          started_at: null,
          error_message: 'Auto-recovered from stalled state',
          updated_at: new Date().toISOString()
        })
        .in('id', stalledJobs.map(j => j.id));

      if (resetError) {
        console.error('❌ Error resetting stalled jobs:', resetError);
        healthReport.issues.push(`Failed to reset stalled jobs: ${resetError.message}`);
      } else {
        healthReport.actions.push(`Reset ${stalledJobs.length} stalled jobs to pending`);
        console.log(`✅ Reset ${stalledJobs.length} stalled jobs to pending`);
      }
    }

    // Check for accumulating pending jobs (might indicate processor not running)
    const { data: pendingJobs, error: pendingError } = await supabaseClient
      .from('background_jobs')
      .select('id, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (!pendingError && pendingJobs && pendingJobs.length > 0) {
      const oldestPending = new Date(pendingJobs[0].created_at);
      const ageMinutes = (Date.now() - oldestPending.getTime()) / (1000 * 60);
      
      if (ageMinutes > 2) { // Jobs pending for more than 2 minutes
        console.log(`⚠️ Found ${pendingJobs.length} pending jobs, oldest is ${ageMinutes.toFixed(1)} minutes old`);
        healthReport.issues.push(`${pendingJobs.length} jobs pending for ${ageMinutes.toFixed(1)} minutes`);
        
        // Try to trigger job processing
        try {
          console.log('🚀 Triggering job processor to handle pending jobs...');
          const { error: triggerError } = await supabaseClient.functions.invoke('workflow-job-processor', {
            body: { action: 'process_jobs', maxJobs: 50 }
          });
          
          if (triggerError) {
            console.error('❌ Error triggering job processor:', triggerError);
            healthReport.issues.push(`Failed to trigger job processor: ${triggerError.message}`);
          } else {
            healthReport.actions.push(`Triggered job processor for ${pendingJobs.length} pending jobs`);
            console.log('✅ Successfully triggered job processor');
          }
        } catch (error) {
          console.error('❌ Exception triggering job processor:', error);
          healthReport.issues.push(`Exception triggering job processor: ${error.message}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error in stalled jobs handler:', error);
    healthReport.issues.push(`Stalled jobs handler error: ${error.message}`);
  }
}
