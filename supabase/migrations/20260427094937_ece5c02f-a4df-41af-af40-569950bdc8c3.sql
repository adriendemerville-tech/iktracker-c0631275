-- Restrict direct SELECT on partner_api_keys to admins only.
-- Viewers must go through a safe view that excludes jwt_secret and key_hash.

-- 1) Drop the viewer SELECT policy that exposes jwt_secret
DROP POLICY IF EXISTS "Viewers read partner keys" ON public.partner_api_keys;

-- 2) Create a safe view exposing only non-sensitive columns
CREATE OR REPLACE VIEW public.partner_api_keys_safe
WITH (security_invoker = true) AS
SELECT
  id,
  partner_name,
  key_prefix,
  scopes,
  monthly_quota,
  usage_current_month,
  usage_reset_at,
  is_active,
  last_used_at,
  created_at,
  updated_at,
  created_by
FROM public.partner_api_keys;

-- 3) Grant SELECT on the safe view to authenticated users.
--    Underlying table RLS still applies (security_invoker), so we add
--    a dedicated SELECT policy on the table for viewers that does NOT
--    permit reading jwt_secret / key_hash directly — but Postgres RLS
--    is row-level, not column-level. Column safety is enforced by the
--    view definition itself + revoking direct table access from viewers.

-- Allow viewers to read rows ONLY through the safe view by adding back a
-- row-level SELECT policy. Column-level protection is provided by the view
-- (which excludes jwt_secret/key_hash). Direct table SELECT by a viewer
-- would still expose secrets, so we instead grant column-level SELECT.

-- 4) Revoke broad SELECT and grant column-level SELECT to authenticated role
REVOKE SELECT ON public.partner_api_keys FROM authenticated;
GRANT SELECT (
  id,
  partner_name,
  key_prefix,
  scopes,
  monthly_quota,
  usage_current_month,
  usage_reset_at,
  is_active,
  last_used_at,
  created_at,
  updated_at,
  created_by
) ON public.partner_api_keys TO authenticated;

-- 5) Re-add the viewer SELECT policy (row-level), now safe because
--    column-level grants forbid reading jwt_secret / key_hash.
CREATE POLICY "Viewers read partner keys (safe columns)"
ON public.partner_api_keys
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'viewer'::app_role));

-- 6) Ensure the safe view is selectable by authenticated users
GRANT SELECT ON public.partner_api_keys_safe TO authenticated;

COMMENT ON VIEW public.partner_api_keys_safe IS
  'Safe projection of partner_api_keys excluding jwt_secret and key_hash. Use this view from the frontend.';
COMMENT ON COLUMN public.partner_api_keys.jwt_secret IS
  'Sensitive — only readable by admins (via ALL policy) and service_role. Never expose to viewer role.';