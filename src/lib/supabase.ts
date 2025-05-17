
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our Supabase database tables
export type Team = {
  id: string;
  name: string;
  created_at?: string;
  user_id: string;
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
