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
    
    // Create batch records with explicit type safety
    const batchRecords = batch.map((url) => {
      // Ensure all values are explicitly typed correctly
      const record = {
        parent_source_id: String(parentSourceId),     // Ensure string
        customer_id: String(teamId),                  // Ensure string
        url: String(url),                             // Ensure string
        status: 'pending',                            // Explicit string literal
        priority: String(priority),                   // Ensure string (convert any boolean/other type)
        retry_count: Number(0),                       // Ensure number
        max_retries: Number(3),                       // Ensure number
        created_at: new Date().toISOString()          // ISO string format
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
      failedCount += batch.length;
      continue;
    }

    console.log(`📦 Inserting batch ${Math.floor(i/batchSize) + 1} with ${batchRecords.length} records`);
    
    // DETAILED PER-FIELD LOGGING - Log every field and its type
    batchRecords.forEach((row, idx) => {
      console.log(`🔍 [Batch ${Math.floor(i/batchSize)+1}, Record ${idx+1}]`);
      Object.entries(row).forEach(([field, value]) => {
        console.log(`   • ${field}:`, value, `(JS type: ${typeof value})`);
      });
    });

    try {
      const { data: batchResult, error: batchError } = await supabase
        .from('source_pages')
        .insert(batchRecords)
        .select('id');
      
      if (batchError) {
        console.error(`❌ Batch insertion failed for URLs ${i+1}-${i+batch.length}:`, {
          code: batchError.code,
          message: batchError.message,
          details: batchError.details,
          hint: batchError.hint
        });
        
        // Log the problematic record for debugging
        if (batchRecords.length > 0) {
          console.error(`❌ First record in failed batch:`, JSON.stringify(batchRecords[0], null, 2));
        }
        
        // Check for specific type error patterns
        if (batchError.message?.includes('operator does not exist') || batchError.code === '42883') {
          console.error(`❌ TYPE MISMATCH ERROR: Database schema expects different types than provided`);
          console.error(`❌ This suggests a column type mismatch - check table schema vs. record structure`);
        }
        
        failedCount += batch.length;
        
        // Add URLs from this batch to failed list
        batch.forEach(url => {
          failedUrls.push({ 
            url, 
            errors: [`Database insertion failed: ${batchError.message}`] 
          });
        });
      } else {
        insertedCount += batchRecords.length;
        console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}: ${insertedCount}/${urls.length} URLs processed`);
      }
    } catch (unexpectedError) {
      console.error(`❌ Unexpected error in batch ${Math.floor(i/batchSize) + 1}:`, unexpectedError);
      failedCount += batch.length;
      
      // Add URLs from this batch to failed list
      batch.forEach(url => {
        failedUrls.push({ 
          url, 
          errors: [`Unexpected error: ${unexpectedError instanceof Error ? unexpectedError.message : String(unexpectedError)}`] 
        });
      });
    }
  }
  
  console.log(`✅ Batch insertion completed: ${insertedCount} successful, ${failedCount} failed out of ${urls.length} total`);
  
  if (failedCount > 0) {
    if (failedUrls.length > 0) {
      console.warn(`⚠️ Failed URLs summary:`, failedUrls.slice(0, 5).map(f => ({ url: f.url, error: f.errors[0] })));
    }
    console.warn(`⚠️ ${failedCount} insertions failed - check validation errors and database schema compatibility`);
    
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
