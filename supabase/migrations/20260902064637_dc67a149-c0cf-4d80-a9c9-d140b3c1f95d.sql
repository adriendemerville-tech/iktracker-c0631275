CREATE OR REPLACE FUNCTION private.get_signup_growth_by_month_admin()
RETURNS TABLE(month date, new_users bigint, total_users bigint, rate numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, public, auth
AS $$
  WITH months AS (
    SELECT generate_series(
      date_trunc('year', now())::date,
      date_trunc('month', now())::date,
      interval '1 month'
    )::date AS month
  ),
  counts AS (
    SELECT
      date_trunc('month', u.created_at)::date AS month,
      count(*) AS new_users
    FROM auth.users u
    WHERE u.created_at >= date_trunc('year', now())
    GROUP BY 1
  ),
  base AS (
    SELECT count(*) AS total_before
    FROM auth.users u
    WHERE u.created_at < date_trunc('year', now())
  ),
  cum AS (
    SELECT
      m.month,
      COALESCE(c.new_users, 0) AS new_users,
      (SELECT total_before FROM base)
        + COALESCE(sum(COALESCE(c.new_users, 0)) OVER (ORDER BY m.month), 0) AS total_users
    FROM months m
    LEFT JOIN counts c ON c.month = m.month
  )
  SELECT
    month,
    new_users,
    total_users,
    CASE WHEN total_users > 0
      THEN round(100.0 * new_users::numeric / total_users, 1)
      ELSE 0
    END AS rate
  FROM cum
  ORDER BY month;
$$;

REVOKE ALL ON FUNCTION private.get_signup_growth_by_month_admin() FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_signup_growth_by_month()
RETURNS TABLE(month date, new_users bigint, total_users bigint, rate numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT * FROM private.get_signup_growth_by_month_admin()
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

REVOKE ALL ON FUNCTION public.get_signup_growth_by_month() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_signup_growth_by_month() TO authenticated;