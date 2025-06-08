
// Database table type definitions
export interface AgentSource {
  id: string;
  agent_id: string;
  team_id: string;
  source_type: string;
  title: string;
  url?: string;
  content?: string;
  file_path?: string;
  metadata?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  progress?: number;
  links_count?: number;
  parent_source_id?: string;
  is_excluded?: boolean;
  last_crawled_at?: string;
  crawl_status?: string;
  error_message?: string;
  raw_text?: any;
  compression_ratio?: number;
  original_size?: number;
  compressed_size?: number;
  total_jobs?: number;
  completed_jobs?: number;
  failed_jobs?: number;
  respect_robots?: boolean;
  max_concurrent_jobs?: number;
  total_content_size?: number;
  compressed_content_size?: number;
  unique_chunks?: number;
  duplicate_chunks?: number;
  workflow_status?: string;
  previous_status?: string;
  workflow_metadata?: any;
  status_history?: any;
  requires_manual_training?: boolean;
  total_processing_time_ms?: number;
  avg_compression_ratio?: number;
  discovery_completed?: boolean;
  children_pending?: number;
  children_failed?: number;
  children_completed?: number;
  total_children?: number;
  global_compression_ratio?: number;
  pending_deletion?: boolean;
  include_paths?: string[];
  exclude_paths?: string[];
  extraction_method?: string;
  keywords?: string[];
  content_summary?: string;
}

export interface BackgroundJob {
  id: string;
  job_type: string;
  source_id: string;
  page_id?: string;
  job_key?: string;
  payload?: any;
  status?: string;
  priority?: number;
  max_attempts?: number;
  attempts?: number;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
  worker_id?: string;
}

export interface SourcePage {
  id: string;
  parent_source_id: string;
  customer_id: string;
  url: string;
  status: string;
  priority?: string;
  processing_status?: string;
  retry_count: number;
  max_retries?: number;
  content_size?: number;
  compression_ratio?: number;
  chunks_created?: number;
  duplicates_found?: number;
  processing_time_ms?: number;
  error_message?: string;
  content_hash?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
  workflow_status?: string;
  previous_status?: string;
}

export interface CrawlJob {
  id: string;
  parent_source_id: string;
  customer_id: string;
  url: string;
  status: string;
  priority?: string;
  retry_count: number;
  max_retries?: number;
  content_size?: number;
  compression_ratio?: number;
  chunks_created?: number;
  duplicates_found?: number;
  processing_time_ms?: number;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
}

export interface SourceChunk {
  id: string;
  source_id: string;
  content: string;
  chunk_index: number;
  token_count: number;
  metadata?: any;
  is_duplicate?: boolean;
  duplicate_of_chunk_id?: string;
  content_hash?: string;
  created_at: string;
  created_by?: string;
}

export interface SourceEmbedding {
  id: string;
  chunk_id: string;
  embedding?: any;
  model_name: string;
  created_at: string;
}

export interface WorkflowEvent {
  id: string;
  source_id: string;
  page_id?: string;
  event_type: string;
  from_status?: string;
  to_status: string;
  metadata?: any;
  error_message?: string;
  created_at?: string;
  processed_at?: string;
}

export interface Agent {
  id: string;
  name: string;
  team_id: string;
  color: string;
  image?: string;
  ai_model?: string;
  ai_instructions?: string;
  ai_temperature?: number;
  ai_prompt_template?: string;
  visibility: string;
  status?: string;
  rate_limit_enabled: boolean;
  rate_limit_messages: number;
  rate_limit_time_window: number;
  rate_limit_message: string;
  last_trained_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Team {
  id: string;
  name: string;
  created_by: string;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  created_at?: string;
}

export interface Conversation {
  id: string;
  agent_id: string;
  session_id: string;
  title?: string;
  source: string;
  status: string;
  created_at: string;
  updated_at: string;
  ended_at?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  is_agent: boolean;
  feedback?: string;
  timestamp: string;
  created_at: string;
}

// Utility types for common query patterns
export type BackgroundJobStatus = Pick<BackgroundJob, 'id' | 'status' | 'created_at' | 'started_at' | 'completed_at'>;
export type SourcePageStatus = Pick<SourcePage, 'id' | 'status' | 'parent_source_id'>;
export type AgentSourceBasic = Pick<AgentSource, 'id' | 'title' | 'url' | 'crawl_status' | 'updated_at'>;
