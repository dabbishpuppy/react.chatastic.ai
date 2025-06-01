
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

export interface AgentSource extends Omit<DbAgentSource, 'metadata'> {
  metadata?: Record<string, any>;
  // Ensure all new industrial-scale crawling fields are included
  total_jobs?: number | null;
  completed_jobs?: number | null;
  failed_jobs?: number | null;
  exclude_paths?: string[] | null;
  include_paths?: string[] | null;
  respect_robots?: boolean | null;
  max_concurrent_jobs?: number | null;
  total_content_size?: number | null;
  compressed_content_size?: number | null;
  unique_chunks?: number | null;
  duplicate_chunks?: number | null;
  global_compression_ratio?: number | null;
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
