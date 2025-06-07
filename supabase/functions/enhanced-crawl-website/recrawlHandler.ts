
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function handleChildPageRecrawl(
  parentSourceId: string,
  url: string,
  priority: string,
  agentId: string
) {
  console.log('🔄 Processing child page recrawl for parent:', parentSourceId);
  
  // STEP 1: Mark parent as recrawling with strong metadata
  console.log('🔄 Step 1: Setting parent to recrawling state...');
  const { error: parentUpdateError } = await supabase
    .from('agent_sources')
    .update({
      crawl_status: 'recrawling',
      progress: 0,
      metadata: {
        is_recrawling: true,
        recrawl_started_at: new Date().toISOString(),
        recrawl_target_url: url,
        recrawl_initiated_by: 'child_page_recrawl',
        last_recrawl_update: new Date().toISOString()
      }
    })
    .eq('id', parentSourceId);

  if (parentUpdateError) {
    console.error('❌ Error updating parent source for recrawl:', parentUpdateError);
    throw new Error(`Failed to initiate parent recrawl: ${parentUpdateError.message}`);
  }

  console.log('✅ Parent source marked as recrawling');

  // STEP 2: Wait a moment to ensure the status is set before proceeding
  await new Promise(resolve => setTimeout(resolve, 500));

  // STEP 3: Update the existing source_pages entry to pending status (which will become in_progress when processed)
  console.log('🔄 Step 2: Updating child page status to pending for processing...');
  const { error: updateError } = await supabase
    .from('source_pages')
    .update({
      status: 'pending',
      started_at: new Date().toISOString(),
      completed_at: null,
      error_message: null,
      retry_count: 0,
      updated_at: new Date().toISOString()
    })
    .eq('parent_source_id', parentSourceId)
    .eq('url', url);

  if (updateError) {
    console.error('❌ Error updating child page status:', updateError);
    throw new Error(`Failed to update child page status: ${updateError.message}`);
  }

  console.log('✅ Child page status updated to pending');

  // STEP 4: Call the process-source-pages function to handle the actual crawling
  console.log('🔄 Step 3: Initiating page processing...');
  const { data: processData, error: processError } = await supabase.functions.invoke('process-source-pages', {
    body: {
      parentSourceId: parentSourceId,
      targetUrl: url,
      priority: priority
    }
  });

  if (processError) {
    console.error('❌ Error calling process-source-pages:', processError);
    // Update the page status to failed
    await supabase
      .from('source_pages')
      .update({
        status: 'failed',
        error_message: `Processing failed: ${processError.message}`,
        completed_at: new Date().toISOString()
      })
      .eq('parent_source_id', parentSourceId)
      .eq('url', url);

    throw new Error(`Failed to process child page: ${processError.message}`);
  }

  console.log('✅ Child page recrawl initiated successfully');
  
  return {
    success: true,
    message: `Child page recrawl initiated for ${url}`,
    parentSourceId: parentSourceId,
    debugInfo: {
      recrawlInitiated: true,
      parentStatus: 'recrawling',
      childStatus: 'pending',
      timestamp: new Date().toISOString()
    }
  };
}
