
-- Helper functions for enhanced crawling functionality

-- Function to get crawl jobs for a source
CREATE OR REPLACE FUNCTION get_crawl_jobs_for_source(parent_source_id UUID)
RETURNS TABLE (
  id UUID,
  parent_source_id UUID,
  customer_id UUID,
  url TEXT,
  status TEXT,
  retry_count INTEGER,
  error_message TEXT,
  content_size INTEGER,
  compression_ratio REAL,
  chunks_created INTEGER,
  duplicates_found INTEGER,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cj.id,
    cj.parent_source_id,
    cj.customer_id,
    cj.url,
    cj.status,
    cj.retry_count,
    cj.error_message,
    cj.content_size,
    cj.compression_ratio,
    cj.chunks_created,
    cj.duplicates_found,
    cj.processing_time_ms,
    cj.created_at,
    cj.started_at,
    cj.completed_at,
    cj.updated_at
  FROM crawl_jobs cj
  WHERE cj.parent_source_id = get_crawl_jobs_for_source.parent_source_id
  ORDER BY cj.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
