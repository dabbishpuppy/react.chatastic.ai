
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

export async function updateJobStatus(
  client: any,
  jobId: string,
  status: string,
  metadata?: any
) {
  const updateData: any = {
    status,
    ...(status === 'in_progress' && { started_at: new Date().toISOString() }),
    ...(status === 'completed' && { completed_at: new Date().toISOString() }),
    ...(status === 'failed' && { completed_at: new Date().toISOString() }),
  };

  // Only add metadata fields that exist in the source_pages table
  if (metadata) {
    if (metadata.content_size) updateData.content_size = metadata.content_size;
    if (metadata.compression_ratio) updateData.compression_ratio = metadata.compression_ratio;
    if (metadata.chunks_created) updateData.chunks_created = metadata.chunks_created;
    if (metadata.duplicates_found) updateData.duplicates_found = metadata.duplicates_found;
    if (metadata.processing_time_ms) updateData.processing_time_ms = metadata.processing_time_ms;
    if (metadata.error_message) updateData.error_message = metadata.error_message;
    if (metadata.content_hash) updateData.content_hash = metadata.content_hash;
  }

  const { error } = await client
    .from('source_pages')
    .update(updateData)
    .eq('id', jobId);

  if (error) {
    throw new Error(`Failed to update job status: ${error.message}`);
  }
}

export async function insertChunks(client: any, chunks: any[]) {
  const { error } = await client
    .from('source_chunks')
    .insert(chunks);

  if (error) {
    throw new Error(`Failed to insert chunks: ${error.message}`);
  }
}
