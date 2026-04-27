CREATE TABLE IF NOT EXISTS public.blog_slug_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug_pattern text NOT NULL UNIQUE,
  is_pattern boolean NOT NULL DEFAULT false,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_slug_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage blog slug blacklist"
ON public.blog_slug_blacklist FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Viewers read blog slug blacklist"
ON public.blog_slug_blacklist FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'viewer'::app_role));

CREATE OR REPLACE FUNCTION public.is_slug_blacklisted(_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blog_slug_blacklist b
    WHERE (b.is_pattern = false AND b.slug_pattern = _slug)
       OR (b.is_pattern = true  AND _slug LIKE b.slug_pattern)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_slug_blacklisted(text) TO anon, authenticated, service_role;