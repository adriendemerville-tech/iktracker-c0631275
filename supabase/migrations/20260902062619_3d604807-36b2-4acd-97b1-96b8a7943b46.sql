-- Monthly signup KPI for admin header: total non-admin users, current-month new users, and signup rate %
CREATE OR REPLACE FUNCTION public.get_monthly_signup_stats()
RETURNS TABLE(total_users bigint, monthly_new_users bigint, rate numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
  v_monthly bigint;
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT COUNT(*)
  INTO v_total
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = u.id AND ur.role = 'admin'
  );

  SELECT COUNT(*)
  INTO v_monthly
  FROM auth.users u
  WHERE u.created_at >= date_trunc('month', CURRENT_DATE)
    AND u.created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
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
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_monthly_signup_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_signup_stats() TO service_role;
