
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface AtomicResult {
  success: boolean;
  pagesCreated: number;
  jobsCreated: number;
  transactionId: string;
  errors: string[];
}

export async function createPagesAndJobsAtomically(
  parentSourceId: string,
  teamId: string,
  urls: string[],
  customerId?: string
): Promise<AtomicResult> {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🔄 Starting atomic creation with transaction ID: ${transactionId}`);
  console.log(`📊 URLs to process: ${urls.length}`);

  if (urls.length === 0) {
    return {
      success: false,
      pagesCreated: 0,
      jobsCreated: 0,
      transactionId,
      errors: ['No URLs provided for processing']
    };
  }

  try {
    // Step 1: Create source_pages records
    const sourcePageRecords = urls.map(url => ({
      parent_source_id: parentSourceId,
      customer_id: customerId || teamId,
      url: url,
      status: 'pending',
      priority: 'normal'
    }));

    console.log(`📝 Creating ${sourcePageRecords.length} source page records...`);
    
    const { data: createdPages, error: pagesError } = await supabaseClient
      .from('source_pages')
      .insert(sourcePageRecords)
      .select('id, url');

    if (pagesError) {
      console.error('❌ Failed to create source pages:', pagesError);
      throw new Error(`Source pages creation failed: ${pagesError.message}`);
    }

    if (!createdPages || createdPages.length === 0) {
      throw new Error('No source pages were created');
    }

    console.log(`✅ Created ${createdPages.length} source page records`);

    // Step 2: Create individual background jobs for each page
    const backgroundJobs = createdPages.map(page => ({
      job_type: 'process_page',
      source_id: parentSourceId,
      page_id: page.id,
      job_key: `process_page:${page.id}:${transactionId}`,
      payload: {
        childJobId: page.id,
        url: page.url,
        parentSourceId: parentSourceId,
        transactionId: transactionId
      },
      priority: 100,
      status: 'pending'
    }));

    console.log(`🔧 Creating ${backgroundJobs.length} background jobs...`);

    const { data: createdJobs, error: jobsError } = await supabaseClient
      .from('background_jobs')
      .insert(backgroundJobs)
      .select('id');

    if (jobsError) {
      console.error('❌ Failed to create background jobs:', jobsError);
      // Clean up created pages if job creation fails
      await supabaseClient
        .from('source_pages')
        .delete()
        .in('id', createdPages.map(p => p.id));
      
      throw new Error(`Background jobs creation failed: ${jobsError.message}`);
    }

    if (!createdJobs || createdJobs.length === 0) {
      throw new Error('No background jobs were created');
    }

    console.log(`✅ Created ${createdJobs.length} background jobs`);

    return {
      success: true,
      pagesCreated: createdPages.length,
      jobsCreated: createdJobs.length,
      transactionId,
      errors: []
    };

  } catch (error) {
    console.error(`❌ Atomic creation failed for transaction ${transactionId}:`, error);
    return {
      success: false,
      pagesCreated: 0,
      jobsCreated: 0,
      transactionId,
      errors: [error instanceof Error ? error.message : 'Unknown error in atomic creation']
    };
  }
}

export async function ensureJobCompleteness(parentSourceId: string): Promise<{ orphanedPages: number; recoveredJobs: number }> {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  console.log(`🔍 Checking job completeness for parent: ${parentSourceId}`);

  try {
    // Find pages without corresponding background jobs
    const { data: orphanedPages, error: orphanError } = await supabaseClient
      .from('source_pages')
      .select('id, url')
      .eq('parent_source_id', parentSourceId)
      .eq('status', 'pending')
      .not('id', 'in', `(
        SELECT DISTINCT page_id 
        FROM background_jobs 
        WHERE page_id IS NOT NULL 
        AND status IN ('pending', 'processing')
      )`);

    if (orphanError) {
      console.error('❌ Error finding orphaned pages:', orphanError);
      return { orphanedPages: 0, recoveredJobs: 0 };
    }

    if (!orphanedPages || orphanedPages.length === 0) {
      console.log('✅ No orphaned pages found');
      return { orphanedPages: 0, recoveredJobs: 0 };
    }

    console.log(`🔧 Found ${orphanedPages.length} orphaned pages, creating recovery jobs...`);

    // Create recovery jobs for orphaned pages
    const recoveryJobs = orphanedPages.map(page => ({
      job_type: 'process_page',
      source_id: parentSourceId,
      page_id: page.id,
      job_key: `recovery:${page.id}:${Date.now()}`,
      payload: {
        childJobId: page.id,
        url: page.url,
        parentSourceId: parentSourceId,
        recovery: true
      },
      priority: 90
    }));

    const { data: createdRecoveryJobs, error: recoveryError } = await supabaseClient
      .from('background_jobs')
      .insert(recoveryJobs)
      .select('id');

    if (recoveryError) {
      console.error('❌ Failed to create recovery jobs:', recoveryError);
      return { orphanedPages: orphanedPages.length, recoveredJobs: 0 };
    }

    console.log(`✅ Created ${createdRecoveryJobs?.length || 0} recovery jobs`);

    return {
      orphanedPages: orphanedPages.length,
      recoveredJobs: createdRecoveryJobs?.length || 0
    };

  } catch (error) {
    console.error('❌ Error in job completeness check:', error);
    return { orphanedPages: 0, recoveredJobs: 0 };
  }
}
