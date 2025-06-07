
-- Fix permissions for aggregate_parent_status function to allow metadata updates
DROP FUNCTION IF EXISTS public.aggregate_parent_status(uuid);

CREATE OR REPLACE FUNCTION public.aggregate_parent_status(parent_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER -- This allows the function to update agent_sources table
AS $function$
DECLARE
  child_stats RECORD;
  parent_status text;
  size_stats RECORD;
  current_parent RECORD;
BEGIN
  -- Get current parent source info
  SELECT crawl_status, status_history
  INTO current_parent
  FROM public.agent_sources
  WHERE id = parent_id;

  -- Count children by status
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed') AS children_completed,
    COUNT(*) FILTER (WHERE status = 'failed')    AS children_failed,
    COUNT(*)                                     AS total_children
  INTO child_stats
  FROM public.source_pages
  WHERE parent_source_id = parent_id;

  -- Calculate size statistics from completed children
  SELECT
    COALESCE(SUM(content_size), 0) AS total_original_size,
    COALESCE(SUM(ROUND(content_size * compression_ratio)), 0) AS total_compressed_size,
    COALESCE(AVG(compression_ratio), 0) AS avg_compression_ratio,
    COALESCE(SUM(chunks_created), 0) AS total_unique_chunks,
    COALESCE(SUM(duplicates_found), 0) AS total_duplicate_chunks
  INTO size_stats
  FROM public.source_pages
  WHERE parent_source_id = parent_id 
    AND status = 'completed'
    AND content_size > 0;

  -- Determine new status based on proper flow: pending -> in_progress -> crawled -> training -> trained
  parent_status := current_parent.crawl_status;

  -- Only update status if we're in a valid transition state
  IF child_stats.total_children = 0 THEN
    -- No children discovered yet, keep current status (likely pending)
    parent_status := COALESCE(parent_status, 'pending');
  ELSIF child_stats.children_completed + child_stats.children_failed = child_stats.total_children THEN
    -- All pages processed
    IF child_stats.children_completed > 0 AND parent_status IN ('pending', 'in_progress') THEN
      parent_status := 'crawled'; -- Ready for training
    END IF;
  ELSIF (child_stats.children_completed > 0 OR child_stats.children_failed > 0) AND parent_status = 'pending' THEN
    -- Some pages processed, move from pending to in_progress
    parent_status := 'in_progress';
  END IF;

  -- Update parent source with all calculated metrics
  UPDATE public.agent_sources
  SET 
    crawl_status = parent_status,
    updated_at = NOW(),
    total_jobs = child_stats.total_children,
    completed_jobs = child_stats.children_completed,
    failed_jobs = child_stats.children_failed,
    -- Size metrics from aggregated child data
    original_size = CASE WHEN size_stats.total_original_size > 0 THEN size_stats.total_original_size ELSE original_size END,
    compressed_size = CASE WHEN size_stats.total_compressed_size > 0 THEN size_stats.total_compressed_size ELSE compressed_size END,
    compression_ratio = CASE WHEN size_stats.avg_compression_ratio > 0 THEN size_stats.avg_compression_ratio ELSE compression_ratio END,
    total_content_size = CASE WHEN size_stats.total_original_size > 0 THEN size_stats.total_original_size ELSE total_content_size END,
    compressed_content_size = CASE WHEN size_stats.total_compressed_size > 0 THEN size_stats.total_compressed_size ELSE compressed_content_size END,
    unique_chunks = CASE WHEN size_stats.total_unique_chunks > 0 THEN size_stats.total_unique_chunks ELSE unique_chunks END,
    duplicate_chunks = CASE WHEN size_stats.total_duplicate_chunks > 0 THEN size_stats.total_duplicate_chunks ELSE duplicate_chunks END,
    global_compression_ratio = CASE WHEN size_stats.avg_compression_ratio > 0 THEN size_stats.avg_compression_ratio ELSE global_compression_ratio END,
    -- Calculate progress percentage
    progress = CASE 
      WHEN child_stats.total_children > 0 THEN 
        ROUND(((child_stats.children_completed + child_stats.children_failed)::NUMERIC / child_stats.total_children::NUMERIC) * 100)
      ELSE 0 
    END,
    -- Update status history only if status changed
    status_history = CASE 
      WHEN parent_status != current_parent.crawl_status THEN
        COALESCE(current_parent.status_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'status', parent_status,
          'timestamp', NOW()::text,
          'message', CASE 
            WHEN parent_status = 'in_progress' THEN 'Crawling started, processing pages'
            WHEN parent_status = 'crawled' THEN 'All pages crawled successfully, ready for training'
            ELSE 'Status updated'
          END
        ))
      ELSE status_history
    END,
    -- Update metadata with aggregation timestamp and child pages size
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'last_aggregation', NOW()::text,
      'aggregated_from_children', child_stats.total_children,
      'size_calculation_method', 'child_page_aggregation',
      'total_child_pages_size', size_stats.total_original_size,
      'child_pages_count', child_stats.children_completed
    )
  WHERE id = parent_id;

  -- Log the aggregation for debugging
  RAISE NOTICE 'Aggregated parent % : status=%, children=%/%, sizes: orig=%, comp=%, ratio=%', 
    parent_id, parent_status, child_stats.children_completed, child_stats.total_children,
    size_stats.total_original_size, size_stats.total_compressed_size, size_stats.avg_compression_ratio;
END;
$function$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.aggregate_parent_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aggregate_parent_status(uuid) TO service_role;
