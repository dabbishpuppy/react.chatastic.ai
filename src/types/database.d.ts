
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
  // PostgrestFilterBuilder interface for query building
  export interface PostgrestFilterBuilder<T = any> {
    select(columns?: string): PostgrestFilterBuilder<T>;
    insert(values: any): PostgrestFilterBuilder<T>;
    update(values: any): PostgrestFilterBuilder<T>;
    delete(): PostgrestFilterBuilder<T>;
    upsert(values: any, options?: { onConflict?: string }): PostgrestFilterBuilder<T>;
    eq(column: string, value: any): PostgrestFilterBuilder<T>;
    neq(column: string, value: any): PostgrestFilterBuilder<T>;
    gt(column: string, value: any): PostgrestFilterBuilder<T>;
    gte(column: string, value: any): PostgrestFilterBuilder<T>;
    lt(column: string, value: any): PostgrestFilterBuilder<T>;
    lte(column: string, value: any): PostgrestFilterBuilder<T>;
    like(column: string, pattern: string): PostgrestFilterBuilder<T>;
    ilike(column: string, pattern: string): PostgrestFilterBuilder<T>;
    is(column: string, value: any): PostgrestFilterBuilder<T>;
    in(column: string, values: any[]): PostgrestFilterBuilder<T>;
    contains(column: string, value: any): PostgrestFilterBuilder<T>;
    containedBy(column: string, value: any): PostgrestFilterBuilder<T>;
    rangeGt(column: string, value: any): PostgrestFilterBuilder<T>;
    rangeGte(column: string, value: any): PostgrestFilterBuilder<T>;
    rangeLt(column: string, value: any): PostgrestFilterBuilder<T>;
    rangeLte(column: string, value: any): PostgrestFilterBuilder<T>;
    rangeAdjacent(column: string, value: any): PostgrestFilterBuilder<T>;
    overlaps(column: string, value: any): PostgrestFilterBuilder<T>;
    textSearch(column: string, query: string): PostgrestFilterBuilder<T>;
    not(column: string, operator: string, value: any): PostgrestFilterBuilder<T>;
    or(filters: string): PostgrestFilterBuilder<T>;
    filter(column: string, operator: string, value: any): PostgrestFilterBuilder<T>;
    match(query: Record<string, any>): PostgrestFilterBuilder<T>;
    order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): PostgrestFilterBuilder<T>;
    limit(count: number): PostgrestFilterBuilder<T>;
    range(from: number, to?: number): PostgrestFilterBuilder<T>;
    single(): PostgrestFilterBuilder<T>;
    maybeSingle(): PostgrestFilterBuilder<T>;
    csv(): PostgrestFilterBuilder<T>;
    geojson(): PostgrestFilterBuilder<T>;
    explain(options?: any): PostgrestFilterBuilder<T>;
    rollback(): PostgrestFilterBuilder<T>;
    returns<NewResult = any>(): PostgrestFilterBuilder<NewResult>;
    then<TResult1 = any, TResult2 = never>(
      onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | undefined | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): Promise<TResult1 | TResult2>;
  }

  // Auth interfaces
  export interface User {
    id: string;
    app_metadata: any;
    user_metadata: any;
    aud: string;
    email?: string;
    created_at: string;
    [key: string]: any;
  }

  export interface Session {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    user: User;
    [key: string]: any;
  }

  export interface AuthChangeEvent {
    event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | 'PASSWORD_RECOVERY';
    session: Session | null;
  }

  export interface AuthResponse {
    data: {
      user: User | null;
      session: Session | null;
    };
    error: any;
  }

  export interface SupabaseAuthClient {
    getSession(): Promise<{ data: { session: Session | null }; error: any }>;
    getUser(): Promise<{ data: { user: User | null }; error: any }>;
    onAuthStateChange(callback: (event: string, session: Session | null) => void): { data: { subscription: any } };
    signOut(): Promise<any>;
    signInWithPassword(credentials: { email: string; password: string }): Promise<AuthResponse>;
    signUp(credentials: { email: string; password: string }): Promise<AuthResponse>;
    signInWithOAuth(options: { provider: string; options?: any }): Promise<AuthResponse>;
  }

  // Realtime interfaces
  export interface RealtimeChannel {
    on(
      type: string,
      config: {
        event: string;
        schema: string;
        table: string;
        filter?: string;
      },
      callback: (payload: any) => void
    ): RealtimeChannel;
    subscribe(): RealtimeChannel;
    unsubscribe(): Promise<string>;
    send(type: string, payload: any): Promise<string>;
  }

  // Functions client
  export interface FunctionsClient {
    invoke(functionName: string, options?: { body?: any }): Promise<{ data: any; error: any }>;
  }

  // Storage client
  export interface SupabaseStorageClient {
    from(bucketName: string): any;
  }

  // Main Supabase client interface
  export interface SupabaseClient<Database = any> {
    from(table: string): PostgrestFilterBuilder<any>;
    rpc<T = any>(
      fn: string,
      params?: object,
      options?: { head?: boolean; count?: null | 'exact' | 'planned' | 'estimated' }
    ): PostgrestFilterBuilder<T>;
    auth: SupabaseAuthClient;
    channel(name: string): RealtimeChannel;
    removeChannel(channel: RealtimeChannel): void;
    functions: FunctionsClient;
    storage: SupabaseStorageClient;
  }

  export function createClient<Database = any>(
    supabaseUrl: string,
    supabaseKey: string,
    options?: any
  ): SupabaseClient<Database>;
}
