import { Json } from '@supabase/supabase-js';

export interface AgentSource {
  id: string;
  agent_id: string;
  title: string;
  url?: string;
  file_path?: string;
  source_type: 'website' | 'file' | 'text' | 'qa';
  content?: string;
  is_active: boolean;
  is_excluded?: boolean;
  parent_source_id?: string;
  links_count?: number;
  progress?: number;
  crawl_status?: string;
  created_at: string;
  updated_at: string;
  team_id: string;
  created_by?: string;
  updated_by?: string;
  original_size?: number;
  compressed_size?: number;
  compression_ratio?: number;
  raw_text?: Uint8Array;
  last_crawled_at?: string;
  
  // Workflow-related properties
  workflow_status?: 'CREATED' | 'CRAWLING' | 'COMPLETED' | 'TRAINING' | 'TRAINED' | 'PENDING_REMOVAL' | 'REMOVED' | 'ERROR';
  previous_status?: 'CREATED' | 'CRAWLING' | 'COMPLETED' | 'TRAINING' | 'TRAINED' | 'PENDING_REMOVAL' | 'REMOVED' | 'ERROR';
  workflow_metadata?: Record<string, any>;
  pending_deletion?: boolean;
  
  // Legacy fields for backward compatibility
  total_jobs?: number;
  completed_jobs?: number;
  failed_jobs?: number;
  max_concurrent_jobs?: number;
  respect_robots?: boolean;
  total_children?: number;
  children_completed?: number;
  children_failed?: number;
  children_pending?: number;
  discovery_completed?: boolean;
  total_content_size?: number;
  compressed_content_size?: number;
  unique_chunks?: number;
  duplicate_chunks?: number;
  global_compression_ratio?: number;
  content_summary?: string;
  keywords?: string[];
  extraction_method?: string[];
  include_paths?: string[];
  exclude_paths?: string[];
  requires_manual_training?: boolean;
  total_processing_time_ms?: number;
  avg_compression_ratio?: number;
  status_history?: any[];
  error_message?: string;
  metadata?: Record<string, any>;
}
