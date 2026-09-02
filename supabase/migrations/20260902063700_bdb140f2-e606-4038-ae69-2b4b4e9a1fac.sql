DROP FUNCTION IF EXISTS public.get_monthly_signup_stats();

CREATE FUNCTION public.get_monthly_signup_stats()
RETURNS TABLE(
  total_users bigint,
  monthly_new_users bigint,
  rate numeric,
  period_start date,
  period_end date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
  v_monthly bigint;
  v_period_start date := (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date;
  v_period_end date := date_trunc('month', CURRENT_DATE)::date;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT COUNT(*)
  INTO v_total
  FROM auth.users u
  WHERE u.created_at < v_period_end
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = u.id AND ur.role = 'admin'
    );

  SELECT COUNT(*)
  INTO v_monthly
  FROM auth.users u
  WHERE u.created_at >= v_period_start
    AND u.created_at < v_period_end
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = u.id AND ur.role = 'admin'
    );

  RETURN QUERY SELECT
    v_total,
    v_monthly,
    CASE
      WHEN v_total > 0 THEN round((v_monthly::numeric / v_total::numeric) * 100, 2)
      ELSE 0::numeric
    END,
    v_period_start,
    v_period_end;
END;
$$;

REVOKE ALL ON FUNCTION public.get_monthly_signup_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_monthly_signup_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_signup_stats() TO service_role;