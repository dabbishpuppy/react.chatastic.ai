
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';
import { validateSourcePageRecord } from './validation.ts';
import { ValidationError } from './types.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function insertSourcePagesInBatches(
  parentSourceId: string,
  teamId: string,
  urls: string[],
  priority: string
): Promise<void> {
  console.log(`📝 Inserting ${urls.length} URLs in batches...`);
  
  const batchSize = 10;
  let insertedCount = 0;
  let failedCount = 0;
  let failedUrls: ValidationError[] = [];

  // Process URLs in batches
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    
    // Create batch records with strict type validation
    const batchRecords = batch.map((url) => {
      // Create record with EXPLICIT type conversion
      const record = {
        parent_source_id: String(parentSourceId), // Ensure string
        customer_id: String(teamId), // Ensure string
        url: String(url), // Ensure string
        status: String('pending'), // Ensure string, not boolean
        priority: String(priority), // Ensure string, not boolean
        retry_count: Number(0), // Ensure number
        max_retries: Number(3), // Ensure number
        created_at: new Date().toISOString() // Ensure ISO string
      };
      
      // Validate the record before proceeding
      const validationErrors = validateSourcePageRecord(record);
      if (validationErrors.length > 0) {
        console.error(`❌ Record validation failed for URL ${url}:`, validationErrors);
        failedUrls.push({ url, errors: validationErrors });
        return null;
      }
      
      return record;
    }).filter(record => record !== null);

    if (batchRecords.length === 0) {
      console.warn('⚠️ No valid records in this batch, skipping');
      continue;
    }

    console.log(`📦 Inserting batch ${Math.floor(i/batchSize) + 1} with ${batchRecords.length} records`);
    console.log('🔍 Sample record types:', {
      parent_source_id: typeof batchRecords[0].parent_source_id,
      customer_id: typeof batchRecords[0].customer_id,
      url: typeof batchRecords[0].url,
      status: typeof batchRecords[0].status,
      priority: typeof batchRecords[0].priority,
      retry_count: typeof batchRecords[0].retry_count,
      max_retries: typeof batchRecords[0].max_retries,
      created_at: typeof batchRecords[0].created_at
    });

    try {
      const { data: batchResult, error: batchError } = await supabase
        .from('source_pages')
        .insert(batchRecords)
        .select('id');
      
      if (batchError) {
        console.error(`❌ Batch insertion failed for URLs ${i+1}-${i+batch.length}:`, batchError);
        console.error(`❌ Error code:`, batchError.code);
        console.error(`❌ Error message:`, batchError.message);
        console.error(`❌ Error details:`, batchError.details);
        console.error(`❌ Error hint:`, batchError.hint);
        
        // Check for specific type error
        if (batchError.message?.includes('operator does not exist: text = boolean')) {
          console.error(`❌ TYPE ERROR DETECTED: One of the fields is being passed as wrong type`);
          console.error(`❌ Problematic record:`, JSON.stringify(batchRecords[0], null, 2));
        }
        
        failedCount += batch.length;
      } else {
        insertedCount += batchRecords.length;
        console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}: ${insertedCount}/${urls.length} URLs processed`);
      }
    } catch (unexpectedError) {
      console.error(`❌ Unexpected error in batch ${Math.floor(i/batchSize) + 1}:`, unexpectedError);
      failedCount += batch.length;
    }
  }
  
  console.log(`✅ Batch insertion completed: ${insertedCount} successful, ${failedCount} failed out of ${urls.length} total`);
  
  if (failedCount > 0) {
    if (failedUrls.length > 0) {
      console.warn(`⚠️ Validation failed for ${failedUrls.length} URLs: `, JSON.stringify(failedUrls.slice(0, 3), null, 2));
    }
    console.warn(`⚠️ ${failedCount} insertions failed - check table schema and RLS policies`);
    
    // If more than 50% of URLs failed, throw an error
    if (failedCount > urls.length / 2) {
      throw new Error(`Failed to insert majority of URLs (${failedCount}/${urls.length}). Check console for details.`);
    }
  }
}

export async function createParentSource(agentId: string, teamId: string, requestData: any) {
  const parentSourceData = {
    agent_id: agentId,
    team_id: teamId,
    source_type: 'website',
    title: requestData.url,
    url: requestData.url,
    crawl_status: 'pending',
    progress: 0,
    total_jobs: requestData.totalJobs,
    completed_jobs: 0,
    failed_jobs: 0,
    links_count: requestData.totalJobs,
    discovery_completed: false,
    respect_robots: requestData.respectRobots,
    is_active: true,
    metadata: {
      crawl_mode: requestData.crawlMode,
      enable_compression: requestData.enableCompression,
      enable_deduplication: requestData.enableDeduplication,
      priority: requestData.priority
    }
  };

  console.log('📝 Creating parent source with data:', JSON.stringify(parentSourceData, null, 2));

  const { data: parentSource, error: sourceError } = await supabase
    .from('agent_sources')
    .insert(parentSourceData)
    .select()
    .single();

  if (sourceError) {
    console.error('❌ Failed to create parent source:', sourceError);
    throw new Error(`Failed to create parent source: ${sourceError.message}`);
  }

  return parentSource;
}

export async function updateParentSourceStatus(parentSourceId: string, status: string, metadata?: any) {
  const updateData: any = {
    crawl_status: status,
    updated_at: new Date().toISOString()
  };

  if (metadata) {
    updateData.discovery_completed = metadata.discoveryCompleted;
    updateData.total_children = metadata.totalChildren;
    updateData.metadata = metadata.additionalMetadata;
  }

  await supabase
    .from('agent_sources')
    .update(updateData)
    .eq('id', parentSourceId);
}
