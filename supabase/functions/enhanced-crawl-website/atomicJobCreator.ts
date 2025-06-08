
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AtomicJobCreationResult {
  success: boolean;
  pagesCreated: number;
  jobsCreated: number;
  errors: string[];
  transactionId: string;
}

export async function createPagesAndJobsAtomically(
  parentSourceId: string,
  teamId: string,
  urls: string[],
  customerId: string
): Promise<AtomicJobCreationResult> {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const transactionId = `atomic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const result: AtomicJobCreationResult = {
    success: false,
    pagesCreated: 0,
    jobsCreated: 0,
    errors: [],
    transactionId
  };

  console.log(`🔄 Starting atomic job creation for ${urls.length} URLs (Transaction: ${transactionId})`);

  try {
    // Begin transaction by creating all pages first
    const pagesToCreate = urls.map(url => ({
      parent_source_id: parentSourceId,
      customer_id: customerId,
      url: url,
      status: 'pending',
      created_at: new Date().toISOString()
    }));

    const { data: createdPages, error: pagesError } = await supabaseClient
      .from('source_pages')
      .insert(pagesToCreate)
      .select('id, url');

    if (pagesError) {
      result.errors.push(`Failed to create source pages: ${pagesError.message}`);
      return result;
    }

    if (!createdPages || createdPages.length === 0) {
      result.errors.push('No pages were created');
      return result;
    }

    result.pagesCreated = createdPages.length;
    console.log(`✅ Created ${createdPages.length} source pages`);

    // Immediately create corresponding background jobs
    const jobsToCreate = createdPages.map(page => ({
      job_type: 'process_page',
      source_id: parentSourceId,
      page_id: page.id,
      job_key: `atomic:${page.id}:${Date.now()}`,
      payload: {
        childJobId: page.id,
        url: page.url,
        parentSourceId: parentSourceId,
        teamId: teamId,
        customerId: customerId,
        atomicCreation: true,
        transactionId: transactionId
      },
      priority: 100,
      scheduled_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }));

    const { error: jobsError } = await supabaseClient
      .from('background_jobs')
      .insert(jobsToCreate);

    if (jobsError) {
      console.error(`❌ Failed to create background jobs: ${jobsError.message}`);
      
      // Attempt to rollback by deleting the created pages
      try {
        const pageIds = createdPages.map(p => p.id);
        await supabaseClient
          .from('source_pages')
          .delete()
          .in('id', pageIds);
        
        result.errors.push(`Failed to create jobs, rolled back ${createdPages.length} pages: ${jobsError.message}`);
      } catch (rollbackError) {
        result.errors.push(`Failed to create jobs AND rollback failed: ${jobsError.message}`);
        console.error('❌ Rollback failed:', rollbackError);
      }
      
      return result;
    }

    result.jobsCreated = jobsToCreate.length;
    result.success = true;

    console.log(`✅ Atomic creation successful: ${result.pagesCreated} pages + ${result.jobsCreated} jobs`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Atomic creation failed: ${errorMessage}`);
    console.error('❌ Atomic job creation error:', error);
  }

  return result;
}

export async function ensureJobCompleteness(parentSourceId: string): Promise<{
  orphanedPages: number;
  recoveredJobs: number;
  errors: string[];
}> {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const result = {
    orphanedPages: 0,
    recoveredJobs: 0,
    errors: []
  };

  try {
    console.log(`🔍 Ensuring job completeness for parent: ${parentSourceId}`);

    // Find pending pages without background jobs
    const { data: pendingPages, error: pagesError } = await supabaseClient
      .from('source_pages')
      .select('id, url, customer_id')
      .eq('parent_source_id', parentSourceId)
      .eq('status', 'pending');

    if (pagesError) {
      result.errors.push(`Failed to fetch pending pages: ${pagesError.message}`);
      return result;
    }

    if (!pendingPages || pendingPages.length === 0) {
      console.log('✅ No pending pages found');
      return result;
    }

    // Check which ones lack background jobs
    const pageIds = pendingPages.map(p => p.id);
    const { data: existingJobs, error: jobsError } = await supabaseClient
      .from('background_jobs')
      .select('page_id')
      .in('page_id', pageIds)
      .in('status', ['pending', 'processing']);

    if (jobsError) {
      result.errors.push(`Failed to check existing jobs: ${jobsError.message}`);
      return result;
    }

    const existingJobPageIds = new Set(existingJobs?.map(j => j.page_id) || []);
    const orphanedPages = pendingPages.filter(page => !existingJobPageIds.has(page.id));

    result.orphanedPages = orphanedPages.length;

    if (orphanedPages.length === 0) {
      console.log('✅ All pending pages have corresponding jobs');
      return result;
    }

    console.log(`🔧 Creating ${orphanedPages.length} missing jobs for completeness`);

    const recoveryJobs = orphanedPages.map(page => ({
      job_type: 'process_page',
      source_id: parentSourceId,
      page_id: page.id,
      job_key: `recovery:${page.id}:${Date.now()}`,
      payload: {
        childJobId: page.id,
        url: page.url,
        parentSourceId: parentSourceId,
        customerId: page.customer_id,
        recoveryCreation: true
      },
      priority: 80,
      scheduled_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabaseClient
      .from('background_jobs')
      .insert(recoveryJobs);

    if (insertError) {
      result.errors.push(`Recovery job creation failed: ${insertError.message}`);
    } else {
      result.recoveredJobs = recoveryJobs.length;
      console.log(`✅ Created ${recoveryJobs.length} recovery jobs`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Job completeness check failed: ${errorMessage}`);
    console.error('❌ Job completeness error:', error);
  }

  return result;
}
