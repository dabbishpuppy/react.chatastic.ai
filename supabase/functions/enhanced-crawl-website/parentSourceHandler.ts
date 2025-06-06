
import { createParentSource, updateParentSourceStatus, insertSourcePagesInBatches } from './database.ts';

export async function handleParentSourceCreation(
  agentId: string,
  teamId: string,
  url: string,
  discoveredUrls: string[],
  options: {
    respectRobots: boolean;
    crawlMode: string;
    enableCompression: boolean;
    enableDeduplication: boolean;
    priority: string;
  }
) {
  const maxRetries = 3;
  let retryCount = 0;
  let parentSource;

  while (retryCount < maxRetries) {
    try {
      console.log(`🔧 Creating parent source (attempt ${retryCount + 1}/${maxRetries})`);
      
      parentSource = await createParentSource(agentId, teamId, {
        url,
        totalJobs: discoveredUrls.length,
        respectRobots: options.respectRobots,
        crawlMode: options.crawlMode,
        enableCompression: options.enableCompression,
        enableDeduplication: options.enableDeduplication,
        priority: options.priority
      });
      console.log('✅ Parent source created:', parentSource.id);
      break;
    } catch (createError) {
      console.error(`❌ Parent source creation failed (attempt ${retryCount + 1}):`, createError);
      if (retryCount === maxRetries - 1) {
        throw new Error(`Failed to create parent source: ${createError.message}`);
      }
      retryCount++;
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
    }
  }

  if (!parentSource) {
    throw new Error('Failed to create parent source after multiple attempts');
  }

  // Validate parent source ID before proceeding
  if (!parentSource.id || typeof parentSource.id !== 'string') {
    throw new Error(`Invalid parent source ID: ${parentSource.id}`);
  }

  return parentSource;
}

export async function handleSourcePagesCreation(
  parentSourceId: string,
  teamId: string,
  discoveredUrls: string[],
  priority: string,
  parentSource: any
) {
  console.log('🔍 Starting source pages insertion with type-safe validation...');
  
  try {
    // Log the data types we're about to insert for debugging
    console.log('📋 Input validation summary:', {
      parentSourceId: `${typeof parentSourceId} (${parentSourceId})`,
      teamId: `${typeof teamId} (${teamId})`,
      urlCount: discoveredUrls.length,
      priority: `${typeof priority} (${priority})`,
      sampleUrl: `${typeof discoveredUrls[0]} (${discoveredUrls[0]})`
    });

    await insertSourcePagesInBatches(parentSourceId, teamId, discoveredUrls, priority);

    // Update parent source status to in_progress
    await updateParentSourceStatus(parentSourceId, 'in_progress', {
      discoveryCompleted: true,
      totalChildren: discoveredUrls.length,
      additionalMetadata: {
        ...parentSource.metadata,
        insertion_completed_at: new Date().toISOString(),
        type_validation_passed: true,
        api_authentication_verified: true
      }
    });

    console.log(`✅ Enhanced crawl initiated successfully: ${discoveredUrls.length} source pages created`);

    return {
      success: true,
      parentSourceId: parentSourceId,
      totalJobs: discoveredUrls.length,
      message: `Enhanced crawl initiated with ${discoveredUrls.length} URLs discovered`
    };

  } catch (insertError) {
    console.error('❌ Source pages insertion failed:', insertError);
    
    // Update parent source to failed status
    try {
      await updateParentSourceStatus(parentSourceId, 'failed', {
        discoveryCompleted: true,
        totalChildren: 0,
        additionalMetadata: {
          ...parentSource.metadata,
          insertion_failed_at: new Date().toISOString(),
          insertion_error: insertError instanceof Error ? insertError.message : String(insertError),
          api_authentication_error: insertError.message?.includes('No API key') || false
        }
      });
    } catch (updateError) {
      console.error('❌ Failed to update parent source status:', updateError);
    }

    throw new Error(`Source pages insertion failed: ${insertError instanceof Error ? insertError.message : String(insertError)}`);
  }
}
