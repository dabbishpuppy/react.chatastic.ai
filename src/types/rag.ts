import { Database } from "@/integrations/supabase/types";

// Use Supabase generated types as base and extend them
type DbAgentSource = Database['public']['Tables']['agent_sources']['Row'];
type DbSourceChunk = Database['public']['Tables']['source_chunks']['Row'];
type DbSourceEmbedding = Database['public']['Tables']['source_embeddings']['Row'];
type DbTrainingJob = Database['public']['Tables']['agent_training_jobs']['Row'];
type DbAuditLog = Database['public']['Tables']['audit_logs']['Row'];
type DbUserConsent = Database['public']['Tables']['user_consents']['Row'];
type DbRetentionPolicy = Database['public']['Tables']['data_retention_policies']['Row'];

// Core RAG types based on our database schema
export type SourceType = Database['public']['Enums']['source_type'];
export type TrainingStatus = Database['public']['Enums']['training_status'];
export type AuditAction = Database['public']['Enums']['audit_action'];

export interface AgentSource {
  id: string;
  agent_id: string;
  title: string;
  content?: string;
  source_type: SourceType;
  url?: string;
  file_path?: string;
  file_type?: string;
  parent_source_id?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  crawl_status?: string;
  progress?: number;
  total_jobs?: number;
  completed_jobs?: number;
  failed_jobs?: number;
  last_crawled_at?: string;
  discovery_completed?: boolean;
  total_children?: number;
  children_completed?: number;
  children_failed?: number;
  children_pending?: number;
  original_size?: number;
  compressed_size?: number;
  compression_ratio?: number;
  global_compression_ratio?: number;
  total_content_size?: number;
  compressed_content_size?: number;
  unique_chunks?: number;
  duplicate_chunks?: number;
  avg_compression_ratio?: number;
  metadata?: Record<string, any>;
  raw_text?: string;
  created_by?: string;
  updated_by?: string;
  requires_manual_training: boolean; // Add the new required field
}

export interface SourceChunk extends Omit<DbSourceChunk, 'metadata'> {
  metadata?: Record<string, any>;
}

export interface SourceEmbedding extends Omit<DbSourceEmbedding, 'embedding'> {
  embedding: number[];
}

export interface AgentTrainingJob extends DbTrainingJob {}

export interface UserConsent extends DbUserConsent {}

export interface AuditLog extends Omit<DbAuditLog, 'old_values' | 'new_values'> {
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
}

export interface DataRetentionPolicy extends DbRetentionPolicy {}
