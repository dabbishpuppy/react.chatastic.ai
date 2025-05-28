
-- Additional SQL functions for RAG operations

-- Function to search similar embeddings
CREATE OR REPLACE FUNCTION search_similar_embeddings(
  agent_id UUID,
  query_embedding VECTOR(1536),
  similarity_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  chunk_id UUID,
  embedding VECTOR(1536),
  model_name TEXT,
  created_at TIMESTAMPTZ,
  similarity FLOAT,
  chunk_content TEXT,
  chunk_metadata JSONB,
  source_id UUID,
  source_title TEXT,
  source_type source_type
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    se.id,
    se.chunk_id,
    se.embedding,
    se.model_name,
    se.created_at,
    (se.embedding <=> query_embedding) * -1 + 1 AS similarity,
    sc.content AS chunk_content,
    sc.metadata AS chunk_metadata,
    ags.id AS source_id,
    ags.title AS source_title,
    ags.source_type
  FROM source_embeddings se
  JOIN source_chunks sc ON sc.id = se.chunk_id
  JOIN agent_sources ags ON ags.id = sc.source_id
  WHERE ags.agent_id = search_similar_embeddings.agent_id
    AND ags.is_active = true
    AND (se.embedding <=> query_embedding) * -1 + 1 >= similarity_threshold
  ORDER BY se.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to delete all embeddings for an agent
CREATE OR REPLACE FUNCTION delete_agent_embeddings(agent_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM source_embeddings se
  USING source_chunks sc, agent_sources ags
  WHERE se.chunk_id = sc.id
    AND sc.source_id = ags.id
    AND ags.agent_id = delete_agent_embeddings.agent_id;
    
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get embedding statistics for an agent
CREATE OR REPLACE FUNCTION get_agent_embedding_stats(agent_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_embeddings', COUNT(se.id),
    'models_used', ARRAY_AGG(DISTINCT se.model_name),
    'last_updated', MAX(se.created_at)
  ) INTO result
  FROM source_embeddings se
  JOIN source_chunks sc ON sc.id = se.chunk_id
  JOIN agent_sources ags ON ags.id = sc.source_id
  WHERE ags.agent_id = get_agent_embedding_stats.agent_id;
  
  RETURN COALESCE(result, '{"total_embeddings": 0, "models_used": [], "last_updated": null}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to preview cleanup data
CREATE OR REPLACE FUNCTION preview_cleanup_data(team_id UUID)
RETURNS TABLE (
  resource_type TEXT,
  count BIGINT,
  oldest_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH cleanup_preview AS (
    SELECT 
      drp.resource_type,
      CASE 
        WHEN drp.resource_type = 'audit_logs' THEN
          (SELECT COUNT(*) FROM audit_logs al 
           WHERE al.team_id = preview_cleanup_data.team_id 
           AND al.created_at < now() - (drp.retention_days || ' days')::INTERVAL)
        WHEN drp.resource_type = 'sources' THEN
          (SELECT COUNT(*) FROM agent_sources ags 
           JOIN agents a ON a.id = ags.agent_id
           WHERE a.team_id = preview_cleanup_data.team_id 
           AND ags.created_at < now() - (drp.retention_days || ' days')::INTERVAL)
        ELSE 0
      END AS count,
      CASE 
        WHEN drp.resource_type = 'audit_logs' THEN
          (SELECT MIN(al.created_at) FROM audit_logs al 
           WHERE al.team_id = preview_cleanup_data.team_id)
        WHEN drp.resource_type = 'sources' THEN
          (SELECT MIN(ags.created_at) FROM agent_sources ags 
           JOIN agents a ON a.id = ags.agent_id
           WHERE a.team_id = preview_cleanup_data.team_id)
        ELSE NULL
      END AS oldest_date
    FROM data_retention_policies drp
    WHERE drp.team_id = preview_cleanup_data.team_id
  )
  SELECT cp.resource_type, cp.count, cp.oldest_date
  FROM cleanup_preview cp
  WHERE cp.count > 0;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get team access for RLS policies
CREATE OR REPLACE FUNCTION user_has_team_access(team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = user_has_team_access.team_id
    AND tm.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
