
import { Json } from '@/integrations/supabase/types';

// Source types
export type SourceType = 'website' | 'file' | 'text' | 'qa';

// Training status
export type TrainingStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

// Audit types - matching Supabase enum values
export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'export' | 'train' | 'query';

export interface AgentSource {
  id: string;
  agent_id: string;
  team_id: string;
  title: string;
  url?: string;
  file_path?: string;
  source_type: SourceType;
  content?: string;
  is_active: boolean;
  is_excluded?: boolean;
  parent_source_id?: string;
  links_count?: number;
  progress?: number;
  crawl_status?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  original_size?: number;
  compressed_size?: number;
  compression_ratio?: number;
  raw_text?: string;
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
  extraction_method?: string;
  include_paths?: string[];
  exclude_paths?: string[];
  requires_manual_training?: boolean;
  total_processing_time_ms?: number;
  avg_compression_ratio?: number;
  status_history?: any[];
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface AgentTrainingJob {
  id: string;
  agent_id: string;
  status: TrainingStatus;
  total_sources?: number;
  processed_sources?: number;
  total_chunks?: number;
  processed_chunks?: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  created_by?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  agent_id?: string;
  team_id?: string;
  action: AuditAction;
  resource_type: string;
  resource_id?: string;
  old_values?: Json;
  new_values?: Json;
  ip_address?: string | null;
  user_agent?: string;
  created_at: string;
}

export interface DataRetentionPolicy {
  id: string;
  team_id: string;
  resource_type: string;
  retention_days: number;
  auto_delete: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserConsent {
  id: string;
  user_id: string;
  team_id: string;
  consent_type: string;
  consented: boolean;
  consent_date?: string;
  withdrawal_date?: string;
  ip_address?: string | null;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

export interface SourceChunk {
  id: string;
  source_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  metadata?: Json;
  is_duplicate?: boolean;
  duplicate_of_chunk_id?: string;
  content_hash?: string;
  created_at: string;
  created_by?: string;
}

export interface SourceEmbedding {
  id: string;
  chunk_id: string;
  embedding?: number[];
  model_name: string;
  created_at: string;
}

// Optimistic source interface for immediate UI updates
export interface OptimisticSource extends AgentSource {
  isOptimistic: true;
  clientId: string;
}
