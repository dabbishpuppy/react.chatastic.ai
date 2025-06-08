
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function createBackgroundJobs(
  parentSourceId: string,
  teamId: string,
  urls: string[],
  priority: number = 100
): Promise<{ success: boolean; jobsCreated: number; errors: string[] }> {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const errors: string[] = [];
  let jobsCreated = 0;

  console.log(`🔧 Creating background jobs for ${urls.length} URLs...`);

  // First, get all source_pages for this parent
  const { data: sourcePages, error: pagesError } = await supabaseClient
    .from('source_pages')
    .select('id, url')
    .eq('parent_source_id', parentSourceId);

  if (pagesError) {
    errors.push(`Failed to fetch source pages: ${pagesError.message}`);
    return { success: false, jobsCreated: 0, errors };
  }

  // Create a map of URL to page ID
  const urlToPageId = new Map<string, string>();
  sourcePages?.forEach(page => {
    urlToPageId.set(page.url, page.id);
  });

  // Create jobs in batches
  const batchSize = 50;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    
    const jobsToInsert = batch.map(url => {
      const pageId = urlToPageId.get(url);
      if (!pageId) {
        errors.push(`No source_page found for URL: ${url}`);
        return null;
      }

      return {
        job_type: 'process_page',
        source_id: parentSourceId,
        page_id: pageId,
        job_key: `crawl:${parentSourceId}:${pageId}`,
        payload: {
          childJobId: pageId,
          url: url,
          parentSourceId: parentSourceId,
          teamId: teamId
        },
        priority: priority,
        scheduled_at: new Date().toISOString()
      };
    }).filter(job => job !== null);

    if (jobsToInsert.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('background_jobs')
        .insert(jobsToInsert);

      if (insertError) {
        // Handle unique constraint violations gracefully
        if (insertError.code === '23505') {
          console.log(`⚠️ Some jobs already exist for batch ${i / batchSize + 1} - this is normal`);
          jobsCreated += jobsToInsert.length; // Count as created since they exist
        } else {
          errors.push(`Batch ${i / batchSize + 1} failed: ${insertError.message}`);
        }
      } else {
        jobsCreated += jobsToInsert.length;
        console.log(`✅ Created batch ${i / batchSize + 1}: ${jobsToInsert.length} jobs`);
      }
    }
  }

  console.log(`🎯 Job creation completed: ${jobsCreated} jobs created, ${errors.length} errors`);

  return {
    success: errors.length === 0,
    jobsCreated,
    errors
  };
}

export async function ensureJobsExist(parentSourceId: string): Promise<boolean> {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Check for pending pages without jobs
  const { data: pendingPages, error: pagesError } = await supabaseClient
    .from('source_pages')
    .select('id, url, parent_source_id')
    .eq('parent_source_id', parentSourceId)
    .eq('status', 'pending');

  if (pagesError || !pendingPages || pendingPages.length === 0) {
    return true; // No pending pages or error
  }

  // Check which ones lack background jobs
  const pageIds = pendingPages.map(p => p.id);
  const { data: existingJobs } = await supabaseClient
    .from('background_jobs')
    .select('page_id')
    .in('page_id', pageIds)
    .in('status', ['pending', 'processing']);

  const existingJobPageIds = new Set(existingJobs?.map(j => j.page_id) || []);
  const pagesNeedingJobs = pendingPages.filter(page => !existingJobPageIds.has(page.id));

  if (pagesNeedingJobs.length > 0) {
    console.log(`🔧 Creating ${pagesNeedingJobs.length} missing jobs for parent ${parentSourceId}`);
    
    const urls = pagesNeedingJobs.map(p => p.url);
    const result = await createBackgroundJobs(parentSourceId, 'system', urls, 100);
    
    return result.success;
  }

  return true;
}
