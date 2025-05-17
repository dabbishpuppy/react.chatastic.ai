
import { createClient } from '@supabase/supabase-js';

// Check for environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initialize supabase client outside the try block
let supabase;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables are missing. Using default values for development.');
  // This warning will help developers understand what's happening
}

try {
  // Create Supabase client with available credentials
  supabase = createClient(
    supabaseUrl || 'https://xyzcompany.supabase.co',
    supabaseAnonKey || 'public-anon-key-for-testing-only', 
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'wonderwave-auth-storage',
        detectSessionInUrl: true,
        flowType: 'pkce'
      },
      global: {
        fetch: function(url, options) {
          return fetch(url, options).catch(err => {
            console.error('Supabase fetch error:', err);
            throw new Error('Network error. Please check your connection and try again.');
          });
        }
      }
    }
  );
  
  console.log("✅ Supabase client initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize Supabase client:", error);
  // Create a fallback client that will show appropriate errors
  supabase = createClient(
    'https://fallback-url.supabase.co',
    'fallback-anon-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// Export the client
export { supabase };

// Types for our Supabase database tables
export type Team = {
  id: string;
  name: string;
  created_at?: string;
  user_id: string;
  total_conversations?: number;
  avg_response_time?: string;
  usage_percent?: number;
  api_calls?: number;
  satisfaction?: number;
}

export type Agent = {
  id: number;
  name: string;
  team_id: string;
  color: string;
  image: string;
  status: 'active' | 'inactive';
  created_at?: string;
}
