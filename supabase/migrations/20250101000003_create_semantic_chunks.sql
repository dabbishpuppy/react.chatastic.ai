
-- Create semantic_chunks table for global deduplication
CREATE TABLE IF NOT EXISTS public.semantic_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash TEXT NOT NULL UNIQUE,
  compressed_blob BYTEA NOT NULL,
  token_count INTEGER NOT NULL,
  ref_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create source_to_chunk_map table for mapping sources to chunks
CREATE TABLE IF NOT EXISTS public.source_to_chunk_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.agent_sources(id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL REFERENCES public.semantic_chunks(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(source_id, chunk_index)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_semantic_chunks_content_hash ON public.semantic_chunks(content_hash);
CREATE INDEX IF NOT EXISTS idx_semantic_chunks_ref_count ON public.semantic_chunks(ref_count);
CREATE INDEX IF NOT EXISTS idx_source_to_chunk_map_source_id ON public.source_to_chunk_map(source_id);
CREATE INDEX IF NOT EXISTS idx_source_to_chunk_map_chunk_id ON public.source_to_chunk_map(chunk_id);

-- Add triggers for updated_at
CREATE TRIGGER update_semantic_chunks_updated_at
  BEFORE UPDATE ON public.semantic_chunks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.semantic_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_to_chunk_map ENABLE ROW LEVEL SECURITY;

-- RLS policies for semantic_chunks (global table, but restrict access)
CREATE POLICY "Users can view semantic chunks through mappings" ON public.semantic_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.source_to_chunk_map stcm
      JOIN public.agent_sources ags ON stcm.source_id = ags.id
      JOIN public.agents a ON ags.agent_id = a.id
      JOIN public.team_members tm ON a.team_id = tm.team_id
      WHERE stcm.chunk_id = semantic_chunks.id AND tm.user_id = auth.uid()
    )
  );

-- RLS policies for source_to_chunk_map
CREATE POLICY "Users can manage chunk mappings for their sources" ON public.source_to_chunk_map
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agent_sources ags
      JOIN public.agents a ON ags.agent_id = a.id
      JOIN public.team_members tm ON a.team_id = tm.team_id
      WHERE ags.id = source_to_chunk_map.source_id AND tm.user_id = auth.uid()
    )
  );
