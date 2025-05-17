
import { createClient } from '@supabase/supabase-js';

// Check for environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables are missing. Using default values for development.');
  // This warning will help developers understand what's happening
}

// Create Supabase client with available credentials
let supabase;

try {
  supabase = createClient(
    supabaseUrl || 'https://your-supabase-url.supabase.co',
    supabaseAnonKey || 'your-anon-key', 
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    }
  );
  
  console.log("✅ Supabase client initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize Supabase client:", error);
  throw new Error("Failed to initialize Supabase client. Please check your configuration.");
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
