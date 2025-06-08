
import { supabase } from "@/integrations/supabase/client";

export class JobManager {
  static async ensureJobsCreated(parentSourceId: string): Promise<void> {
    try {
      console.log(`🔧 Ensuring background jobs exist for parent: ${parentSourceId}`);
      
      const { data: pendingPages } = await supabase
        .from('source_pages')
        .select('id, url')
        .eq('parent_source_id', parentSourceId)
        .eq('status', 'pending');

      if (!pendingPages || pendingPages.length === 0) {
        return;
      }

      const pageIds = pendingPages.map(p => p.id);
      const { data: existingJobs } = await supabase
        .from('background_jobs')
        .select('page_id')
        .in('page_id', pageIds)
        .in('status', ['pending', 'processing']);

      const existingJobPageIds = new Set(existingJobs?.map(j => j.page_id) || []);
      const pagesNeedingJobs = pendingPages.filter(page => !existingJobPageIds.has(page.id));

      if (pagesNeedingJobs.length > 0) {
        console.log(`🚀 Creating ${pagesNeedingJobs.length} missing background jobs`);
        
        const jobsToCreate = pagesNeedingJobs.map(page => ({
          job_type: 'process_page',
          source_id: parentSourceId,
          page_id: page.id,
          job_key: `ensure:${page.id}:${Date.now()}`,
          payload: { childJobId: page.id, url: page.url },
          priority: 100,
          scheduled_at: new Date().toISOString()
        }));

        await supabase
          .from('background_jobs')
          .insert(jobsToCreate);

        console.log(`✅ Created ${pagesNeedingJobs.length} missing background jobs`);
      }
    } catch (error) {
      console.error('❌ Failed to ensure jobs created:', error);
    }
  }
}
