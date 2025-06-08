
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { HealthReport, OrphanedPage } from './types.ts';

export async function handleOrphanedPages(
  supabaseClient: any,
  healthReport: HealthReport
): Promise<void> {
  // Check for orphaned pending pages (no background jobs)
  const { data: orphanedPages, error: orphanedError } = await supabaseClient
    .from('source_pages')
    .select('id, parent_source_id, url, created_at')
    .eq('status', 'pending')
    .lt('created_at', new Date(Date.now() - 2 * 60 * 1000).toISOString()); // Older than 2 minutes

  if (!orphanedError && orphanedPages) {
    // Check which ones actually lack background jobs
    const pageIds = orphanedPages.map((p: OrphanedPage) => p.id);
    const { data: existingJobs } = await supabaseClient
      .from('background_jobs')
      .select('page_id')
      .in('page_id', pageIds)
      .in('status', ['pending', 'processing']);

    const existingJobPageIds = new Set(existingJobs?.map((j: any) => j.page_id) || []);
    const trulyOrphaned = orphanedPages.filter((page: OrphanedPage) => !existingJobPageIds.has(page.id));

    if (trulyOrphaned.length > 0) {
      healthReport.healthy = false;
      healthReport.issues.push(`${trulyOrphaned.length} pending pages without background jobs`);
      healthReport.orphanedPages = trulyOrphaned.length;

      // Auto-create missing jobs
      const jobsToCreate = trulyOrphaned.map((page: OrphanedPage) => ({
        job_type: 'process_page',
        source_id: page.parent_source_id,
        page_id: page.id,
        job_key: `recovery:${page.id}:${Date.now()}`,
        payload: { 
          childJobId: page.id,
          url: page.url,
          recovery: true 
        },
        priority: 80,
        scheduled_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabaseClient
        .from('background_jobs')
        .insert(jobsToCreate);

      if (!insertError) {
        healthReport.actions.push(`Created ${trulyOrphaned.length} recovery jobs for orphaned pages`);
        console.log(`✅ Created ${trulyOrphaned.length} recovery jobs`);
      } else {
        console.error('❌ Failed to create recovery jobs:', insertError);
      }
    }
  }
}
