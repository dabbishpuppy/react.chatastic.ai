
import { createClient } from '@supabase/supabase-js';

// Check for environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Handle case when running in development without environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are missing. Using default values for development.');
  // This will allow the app to continue running in development
  // In production, these variables should be properly set
}

// Create Supabase client with available credentials
export const supabase = createClient(
  supabaseUrl || 'https://your-supabase-url.supabase.co',
  supabaseAnonKey || 'your-anon-key'
);

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
