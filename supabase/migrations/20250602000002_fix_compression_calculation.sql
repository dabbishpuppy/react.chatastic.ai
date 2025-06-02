
-- Update the get_agent_source_stats function to properly handle compressed website content
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

  -- Count website parent sources only and calculate compressed content size from source_pages
  SELECT 
    COUNT(*),
    COALESCE(SUM(
      CASE 
        WHEN parent_source_id IS NULL THEN
          -- For parent sources, sum up compressed content from child source_pages
          COALESCE(
            (SELECT SUM(
              CASE 
                WHEN compression_ratio IS NOT NULL AND compression_ratio > 0 
                THEN ROUND(content_size * compression_ratio)
                ELSE content_size
              END
            )
            FROM source_pages sp 
            WHERE sp.parent_source_id = ags.id 
              AND sp.status = 'completed'
              AND sp.content_size IS NOT NULL),
            0
          )
        ELSE 0
      END
    ), 0)
  INTO website_count, website_size
  FROM agent_sources ags
  WHERE ags.agent_id = target_agent_id 
    AND ags.source_type = 'website' 
    AND ags.is_active = true
    AND ags.parent_source_id IS NULL;

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

-- Create function to trigger source page processing
CREATE OR REPLACE FUNCTION public.trigger_source_page_processing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- This function can be called to trigger background processing
  -- In a real implementation, this would start a background job
  -- For now, we'll just log that processing should be triggered
  RAISE NOTICE 'Source page processing should be triggered';
END;
$function$;
