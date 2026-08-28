CREATE OR REPLACE FUNCTION public.purge_old_marketing_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.marketing_analytics
  WHERE created_at < now() - interval '730 days';
END;
$$;