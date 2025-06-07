
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Safe wrapper for fetching a single row that may or may not exist
 * Uses .maybeSingle() internally and throws on other errors
 */
export async function fetchMaybeSingle<T>(
  query: any,
  context: string = 'fetchMaybeSingle'
): Promise<T | null> {
  const { data, error } = await query.maybeSingle();
  
  if (error) {
    console.error(`${context} error:`, error);
    throw new Error(`${context} failed: ${error.message}`);
  }
  
  return data;
}

/**
 * Checks existence of multiple IDs in bulk and returns mapped results
 */
export async function checkBulkExistence(
  supabase: SupabaseClient,
  tableName: string,
  ids: string[],
  idColumn: string = 'id'
): Promise<Array<{ id: string; exists: boolean }>> {
  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from(tableName)
    .select(idColumn)
    .in(idColumn, ids);
    
  if (error) {
    console.error(`Bulk existence check failed for ${tableName}:`, error);
    throw new Error(`Bulk existence check failed: ${error.message}`);
  }
  
  const existingIds = new Set(data?.map(row => row[idColumn]) || []);
  
  return ids.map(id => ({
    id,
    exists: existingIds.has(id)
  }));
}

/**
 * Safe error handler for Supabase 406 errors
 */
export function handleSupabaseError(error: any, context: string = 'query'): void {
  if (error?.status === 406) {
    console.warn(`406 Not Acceptable in ${context} - likely no rows found`);
    return; // Don't throw for 406, just log
  }
  
  console.error(`${context} error:`, error);
  throw new Error(`${context} failed: ${error.message}`);
}

/**
 * Production-safe agent existence checker
 */
export async function checkAgentExists(
  supabase: SupabaseClient,
  agentId: string
): Promise<boolean> {
  try {
    const agent = await fetchMaybeSingle(
      supabase
        .from('agents')
        .select('id')
        .eq('id', agentId),
      `checkAgentExists(${agentId})`
    );
    
    return agent !== null;
  } catch (error) {
    console.error('Agent existence check failed:', error);
    return false; // Fail safe
  }
}
