
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
    ...metadata
  };

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
