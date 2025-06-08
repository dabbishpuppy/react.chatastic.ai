
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Safe wrapper for fetching a single row that may or may not exist
 * Uses .maybeSingle() internally and throws on other errors
 */
export async function fetchMaybeSingle<T>(
  query: any,
  context: string = 'fetchMaybeSingle'
): Promise<T | null> {
  try {
    const { data, error } = await query.maybeSingle();
    
    if (error) {
      // Handle 406 Not Acceptable specifically
      if (error.code === 'PGRST116' || error.message?.includes('406')) {
        console.warn(`${context}: No rows found (406 Not Acceptable)`);
        return null;
      }
      
      console.error(`${context} error:`, error);
      throw new Error(`${context} failed: ${error.message}`);
    }
    
    return data as T | null;
  } catch (error: any) {
    // If it's already our custom error, re-throw
    if (error.message?.includes(`${context} failed:`)) {
      throw error;
    }
    
    console.error(`${context} unexpected error:`, error);
    throw new Error(`${context} failed: ${error.message || 'Unknown error'}`);
  }
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

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select(idColumn)
      .in(idColumn, ids);
      
    if (error) {
      console.error(`Bulk existence check failed for ${tableName}:`, error);
      throw new Error(`Bulk existence check failed: ${error.message}`);
    }
    
    const existingIds = new Set(data?.map((row: any) => row[idColumn]) || []);
    
    return ids.map(id => ({
      id,
      exists: existingIds.has(id)
    }));
  } catch (error: any) {
    console.error(`Bulk existence check error for ${tableName}:`, error);
    // Return all as non-existent in case of error
    return ids.map(id => ({ id, exists: false }));
  }
}

/**
 * Safe error handler for Supabase errors with specific error code handling
 */
export function handleSupabaseError(error: any, context: string = 'query'): void {
  // Handle 406 Not Acceptable (no rows found)
  if (error?.code === 'PGRST116' || error?.status === 406 || error?.message?.includes('406')) {
    console.warn(`406 Not Acceptable in ${context} - no rows found`);
    return; // Don't throw for 406, just log
  }
  
  // Handle 500 Internal Server Error
  if (error?.status === 500) {
    console.error(`500 Internal Server Error in ${context}:`, error);
    throw new Error(`${context} failed: Server error (${error.message || 'Unknown server error'})`);
  }
  
  // Handle other specific error codes
  if (error?.code) {
    console.error(`${context} error (${error.code}):`, error);
    throw new Error(`${context} failed: ${error.message || `Error code: ${error.code}`}`);
  }
  
  // Generic error handling
  console.error(`${context} error:`, error);
  throw new Error(`${context} failed: ${error.message || 'Unknown error'}`);
}

/**
 * Production-safe agent existence checker
 */
export async function checkAgentExists(
  supabase: SupabaseClient,
  agentId: string
): Promise<boolean> {
  try {
    const agent = await fetchMaybeSingle<{ id: string }>(
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

/**
 * Safe count query that handles empty results
 */
export async function safeCount(
  query: any,
  context: string = 'count'
): Promise<number> {
  try {
    const { count, error } = await query.select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error(`${context} count error:`, error);
      return 0; // Return 0 for errors
    }
    
    return count || 0;
  } catch (error) {
    console.error(`${context} count failed:`, error);
    return 0;
  }
}

/**
 * Safe query wrapper that handles common Supabase errors
 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  context: string = 'query',
  fallbackValue: T | null = null
): Promise<T | null> {
  try {
    const { data, error } = await queryFn();
    
    if (error) {
      handleSupabaseError(error, context);
    }
    
    return data;
  } catch (error: any) {
    // If it's a handled error, return fallback
    if (error.message?.includes('406 Not Acceptable')) {
      return fallbackValue;
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Validates and formats timestamp for database queries
 */
export function validateTimestamp(timestamp: string | Date | number, context: string = 'timestamp'): string {
  try {
    let date: Date;
    
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      throw new Error('Invalid timestamp type');
    }
    
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date value');
    }
    
    return date.toISOString();
  } catch (error: any) {
    console.error(`${context} timestamp validation failed:`, error);
    // Return current time as fallback
    return new Date().toISOString();
  }
}
