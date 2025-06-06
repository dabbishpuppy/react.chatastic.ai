
-- This SQL function needs to be run to create the source pages statistics function
CREATE OR REPLACE FUNCTION public.get_source_pages_stats(parent_source_id_param UUID)
RETURNS TABLE(
  total_count BIGINT,
  completed_count BIGINT,
  failed_count BIGINT,
  in_progress_count BIGINT,
  pending_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count
  FROM public.source_pages
  WHERE parent_source_id = parent_source_id_param;
$$;

-- Add RLS policy to allow access to source_pages table based on team_id
ALTER TABLE public.source_pages ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows authenticated users to manage their team's pages
CREATE POLICY IF NOT EXISTS "source_pages_team_access" ON public.source_pages
FOR ALL 
TO authenticated
USING (
  customer_id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  customer_id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid()
  )
);
