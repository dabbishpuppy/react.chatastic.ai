
-- Create a helper function to execute arbitrary SQL (use with caution)
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
  RETURN 'SQL executed successfully';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$;

-- Create a function to get RLS policies information
CREATE OR REPLACE FUNCTION public.get_rls_policies_info(table_name text)
RETURNS TABLE(
  policy_name text,
  policy_cmd text,
  policy_using text,
  policy_check text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pol.policyname::text as policy_name,
    pol.cmd::text as policy_cmd,
    pol.qual::text as policy_using,
    pol.with_check::text as policy_check
  FROM pg_policy pol
  JOIN pg_class cls ON pol.polrelid = cls.oid
  WHERE cls.relname = table_name;
END;
$$;
