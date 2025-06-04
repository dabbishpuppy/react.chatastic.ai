
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function updateJobStatus(
  supabaseClient: any,
  jobId: string,
  status: string,
  additionalData: Record<string, any> = {}
) {
  const updateData = {
    status,
    updated_at: new Date().toISOString(),
    ...additionalData
  };

  const { error } = await supabaseClient
    .from('source_pages')
    .update(updateData)
    .eq('id', jobId);

  if (error) {
    throw new Error(`Failed to update job status: ${error.message}`);
  }
}

export async function insertChunks(
  supabaseClient: any,
  sourceId: string,
  chunks: Array<{ content: string; chunk_index: number }>
) {
  const chunksToInsert = chunks.map((chunk, index) => ({
    source_id: sourceId,
    content: chunk.content,
    chunk_index: chunk.chunk_index || index,
    token_count: Math.ceil(chunk.content.length / 4), // Rough token estimate
    created_at: new Date().toISOString()
  }));

  const { data, error } = await supabaseClient
    .from('source_chunks')
    .insert(chunksToInsert)
    .select();

  if (error) {
    throw new Error(`Failed to insert chunks: ${error.message}`);
  }

  return data;
}
