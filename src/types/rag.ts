
// Core RAG types based on our database schema
export type SourceType = 'text' | 'file' | 'website' | 'qa';
export type TrainingStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'export' | 'train' | 'query';

export interface AgentSource {
  id: string;
  agent_id: string;
  source_type: SourceType;
  title: string;
  content?: string;
  metadata?: Record<string, any>;
  file_path?: string;
  url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface SourceChunk {
  id: string;
  source_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface SourceEmbedding {
  id: string;
  chunk_id: string;
  embedding: number[];
  model_name: string;
  created_at: string;
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

export interface UserConsent {
  id: string;
  user_id: string;
  team_id: string;
  consent_type: string;
  consented: boolean;
  consent_date?: string;
  withdrawal_date?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  team_id?: string;
  agent_id?: string;
  action: AuditAction;
  resource_type: string;
  resource_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
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
