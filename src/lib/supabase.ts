
// This file will be removed as we're consolidating to use the official supabase client
import { supabase } from '@/integrations/supabase/client';
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
  id: string;
  name: string;
  team_id: string;
  color: string;
  image: string;
  status: 'active' | 'inactive';
  created_at?: string;
  conversations?: number;
  response_time?: string;
  satisfaction?: number;
}
