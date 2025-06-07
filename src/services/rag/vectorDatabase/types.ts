
// Flat interface definitions to avoid deep generic inference
export interface AgentSourceRow {
  id: string;
  title: string;
  source_type: 'text' | 'file' | 'website' | 'qa';
  url?: string;
  agent_id: string;
}

export interface SourceChunkRow {
  id: string;
  source_id: string;
  content: string;
  metadata: Record<string, any>;
}

// Combined interface for joined queries
export interface ChunkWithAgent {
  id: string;
  source_id: string;
  content: string;
  metadata: Record<string, any>;
  agent_sources: AgentSourceRow;
}

// Alternative flattened structure
export interface FlatChunkWithAgent {
  chunk_id: string;
  source_id: string;
  content: string;
  metadata: Record<string, any>;
  source_title: string;
  source_type: 'text' | 'file' | 'website' | 'qa';
  source_url?: string;
  agent_id: string;
}
