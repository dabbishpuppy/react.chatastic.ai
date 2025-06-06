
// Type definitions for Supabase RPC functions

declare namespace Database {
  namespace Rpc {
    interface SourcePagesStats {
      total_count: number;
      completed_count: number;
      failed_count: number;
      in_progress_count: number;
      pending_count: number;
    }
  }
}

declare module '@supabase/supabase-js' {
  interface SupabaseClient<Database = any> {
    rpc<T = any>(
      fn: string,
      params?: object,
      options?: { head?: boolean; count?: null | 'exact' | 'planned' | 'estimated' }
    ): PostgrestFilterBuilder<T>;
  }
}
