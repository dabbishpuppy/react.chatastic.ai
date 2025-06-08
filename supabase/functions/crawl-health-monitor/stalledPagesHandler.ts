
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { HealthReport, StalledPage } from './types.ts';

export async function handleStalledPages(
  supabaseClient: any,
  healthReport: HealthReport
): Promise<void> {
  // Check for stalled source pages
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: stalledPages, error: stalledPagesError } = await supabaseClient
    .from('source_pages')
    .select('id, parent_source_id, url')
    .eq('status', 'in_progress')
    .lt('started_at', fiveMinutesAgo);

  if (!stalledPagesError && stalledPages && stalledPages.length > 0) {
    healthReport.healthy = false;
    healthReport.issues.push(`${stalledPages.length} pages stuck in processing`);

    // Reset stalled pages
    const { error: resetPagesError } = await supabaseClient
      .from('source_pages')
      .update({
        status: 'pending',
        started_at: null,
        retry_count: supabaseClient.raw('COALESCE(retry_count, 0) + 1'),
        updated_at: new Date().toISOString()
      })
      .in('id', stalledPages.map((p: StalledPage) => p.id));

    if (!resetPagesError) {
      healthReport.actions.push(`Reset ${stalledPages.length} stalled pages to pending`);
    }
  }
}
