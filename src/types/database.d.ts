
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
  export interface SupabaseClient<Database = any> {
    rpc<T = any>(
      fn: string,
      params?: object,
      options?: { head?: boolean; count?: null | 'exact' | 'planned' | 'estimated' }
    ): PostgrestFilterBuilder<T>;
  }
  
  // Add exported type declarations
  export type User = {
    id: string;
    app_metadata: any;
    user_metadata: any;
    aud: string;
    created_at: string;
    [key: string]: any;
  };
  
  export type Session = {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    user: User;
    [key: string]: any;
  };
  
  export function createClient<Database = any>(
    supabaseUrl: string,
    supabaseKey: string,
    options?: any
  ): SupabaseClient<Database>;
}
