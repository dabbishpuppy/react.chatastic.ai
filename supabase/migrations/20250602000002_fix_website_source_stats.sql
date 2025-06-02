
-- Update the get_agent_source_stats function to properly handle website sources
CREATE OR REPLACE FUNCTION public.get_agent_source_stats(target_agent_id uuid)
RETURNS TABLE(total_sources integer, total_bytes bigint, sources_by_type jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  text_count INTEGER := 0;
  file_count INTEGER := 0;
  website_count INTEGER := 0;
  qa_count INTEGER := 0;
  text_size BIGINT := 0;
  file_size BIGINT := 0;
  website_size BIGINT := 0;
  qa_size BIGINT := 0;
  total_size BIGINT := 0;
BEGIN
  -- Count text sources and calculate size from metadata file_size or content length
  SELECT 
    COUNT(*),
    COALESCE(SUM(
      CASE 
        WHEN metadata->>'file_size' IS NOT NULL AND (metadata->>'file_size')::bigint > 0 
        THEN (metadata->>'file_size')::bigint
        ELSE LENGTH(COALESCE(content, ''))
      END
    ), 0)
  INTO text_count, text_size
  FROM agent_sources 
  WHERE agent_id = target_agent_id 
    AND source_type = 'text' 
    AND is_active = true;

  -- Count file sources and calculate size from metadata file_size or content length
  SELECT 
    COUNT(*),
    COALESCE(SUM(
      CASE 
        WHEN metadata->>'file_size' IS NOT NULL AND (metadata->>'file_size')::bigint > 0 
        THEN (metadata->>'file_size')::bigint
        ELSE LENGTH(COALESCE(content, ''))
      END
    ), 0)
  INTO file_count, file_size
  FROM agent_sources 
  WHERE agent_id = target_agent_id 
    AND source_type = 'file' 
    AND is_active = true;

  -- Count website sources: count child pages instead of parent sources
  -- Get size from compressed content in source_pages
  SELECT 
    COALESCE(COUNT(sp.id), 0) as page_count,
    COALESCE(SUM(
      CASE 
        WHEN sp.content_size IS NOT NULL AND sp.content_size > 0 AND sp.compression_ratio IS NOT NULL 
        THEN ROUND(sp.content_size * sp.compression_ratio)
        WHEN sp.content_size IS NOT NULL AND sp.content_size > 0 
        THEN sp.content_size
        ELSE 0
      END
    ), 0) as total_compressed_size
  INTO website_count, website_size
  FROM agent_sources ags
  LEFT JOIN source_pages sp ON sp.parent_source_id = ags.id AND sp.status = 'completed'
  WHERE ags.agent_id = target_agent_id 
    AND ags.source_type = 'website' 
    AND ags.is_active = true
    AND ags.parent_source_id IS NULL; -- Only parent sources

  -- Count Q&A sources and calculate size from metadata file_size or content length
  SELECT 
    COUNT(*),
    COALESCE(SUM(
      CASE 
        WHEN metadata->>'file_size' IS NOT NULL AND (metadata->>'file_size')::bigint > 0 
        THEN (metadata->>'file_size')::bigint
        ELSE LENGTH(COALESCE(content, ''))
      END
    ), 0)
  INTO qa_count, qa_size
  FROM agent_sources 
  WHERE agent_id = target_agent_id 
    AND source_type = 'qa' 
    AND is_active = true;

  -- Calculate total size
  total_size := text_size + file_size + website_size + qa_size;

  RETURN QUERY SELECT 
    (text_count + file_count + website_count + qa_count)::INTEGER as total_sources,
    total_size as total_bytes,
    jsonb_build_object(
      'text', jsonb_build_object('count', text_count, 'size', text_size),
      'file', jsonb_build_object('count', file_count, 'size', file_size),
      'website', jsonb_build_object('count', website_count, 'size', website_size),
      'qa', jsonb_build_object('count', qa_count, 'size', qa_size)
    ) as sources_by_type;
END;
$function$;
