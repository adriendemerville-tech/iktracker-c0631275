-- =====================================================
-- 1. TABLE outbound_partners (catalogue des partenaires)
-- =====================================================
CREATE TYPE public.partner_category AS ENUM (
  'neobank', 'accounting', 'insurance', 'fuel_card', 'leasing', 'other'
);

CREATE TYPE public.commission_model AS ENUM ('cpa', 'cps', 'cpc');

CREATE TABLE public.outbound_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  logo_url text,
  tagline text,
  description text,
  category public.partner_category NOT NULL DEFAULT 'other',
  target_url text NOT NULL,
  commission_amount numeric(10,2) DEFAULT 0,
  commission_model public.commission_model NOT NULL DEFAULT 'cpa',
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  target_personas text[] NOT NULL DEFAULT ARRAY['all']::text[],
  target_pages text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.outbound_partners TO anon, authenticated;
GRANT ALL ON public.outbound_partners TO service_role;

ALTER TABLE public.outbound_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active partners are publicly readable"
  ON public.outbound_partners FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins manage partners"
  ON public.outbound_partners FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_outbound_partners_updated_at
  BEFORE UPDATE ON public.outbound_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_outbound_partners_active ON public.outbound_partners(is_active, priority DESC);
CREATE INDEX idx_outbound_partners_pages ON public.outbound_partners USING GIN(target_pages);

-- =====================================================
-- 2. TABLE partner_clicks (tracking des clics sortants)
-- =====================================================
CREATE TABLE public.partner_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.outbound_partners(id) ON DELETE CASCADE,
  user_id uuid,
  session_id text,
  page text,
  placement text,
  persona text,
  referrer text,
  user_agent text,
  ip_address inet,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.partner_clicks TO anon, authenticated;
GRANT SELECT ON public.partner_clicks TO authenticated;
GRANT ALL ON public.partner_clicks TO service_role;

ALTER TABLE public.partner_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a click"
  ON public.partner_clicks FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins and viewers can read clicks"
  ON public.partner_clicks FOR SELECT
  TO authenticated
  USING (public.has_admin_or_viewer_role(auth.uid()));

CREATE INDEX idx_partner_clicks_partner_date ON public.partner_clicks(partner_id, clicked_at DESC);
CREATE INDEX idx_partner_clicks_session ON public.partner_clicks(session_id);

-- =====================================================
-- 3. RPC get_partner_stats
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_partner_stats(days_back integer DEFAULT 30)
RETURNS TABLE(
  partner_id uuid,
  slug text,
  name text,
  category public.partner_category,
  is_active boolean,
  total_clicks bigint,
  unique_sessions bigint,
  estimated_revenue numeric,
  top_page text,
  last_click_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH clicks_filtered AS (
    SELECT pc.*
    FROM public.partner_clicks pc
    WHERE pc.clicked_at >= NOW() - (days_back || ' days')::interval
      AND (pc.user_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = pc.user_id AND ur.role = 'admin'
      ))
      AND (pc.ip_address IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.excluded_ips ei
        WHERE ei.ip_address = pc.ip_address
      ))
  ),
  per_partner AS (
    SELECT
      cf.partner_id,
      COUNT(*)::bigint AS total_clicks,
      COUNT(DISTINCT cf.session_id)::bigint AS unique_sessions,
      MAX(cf.clicked_at) AS last_click
    FROM clicks_filtered cf
    GROUP BY cf.partner_id
  ),
  top_pages AS (
    SELECT DISTINCT ON (cf.partner_id)
      cf.partner_id,
      cf.page,
      COUNT(*) AS c
    FROM clicks_filtered cf
    WHERE cf.page IS NOT NULL
    GROUP BY cf.partner_id, cf.page
    ORDER BY cf.partner_id, COUNT(*) DESC
  )
  SELECT
    p.id,
    p.slug,
    p.name,
    p.category,
    p.is_active,
    COALESCE(pp.total_clicks, 0),
    COALESCE(pp.unique_sessions, 0),
    ROUND(COALESCE(pp.total_clicks, 0) * p.commission_amount * 0.04, 2) AS estimated_revenue,
    tp.page,
    pp.last_click
  FROM public.outbound_partners p
  LEFT JOIN per_partner pp ON pp.partner_id = p.id
  LEFT JOIN top_pages tp ON tp.partner_id = p.id
  ORDER BY COALESCE(pp.total_clicks, 0) DESC;
END;
$$;

-- =====================================================
-- 4. RPC get_partner_clicks_by_day (pour courbes)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_partner_clicks_by_day(
  _partner_id uuid DEFAULT NULL,
  days_back integer DEFAULT 30
)
RETURNS TABLE(day date, clicks bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_admin_or_viewer_role(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    d.day::date,
    COUNT(pc.id)::bigint
  FROM generate_series(CURRENT_DATE - days_back, CURRENT_DATE, '1 day'::interval) AS d(day)
  LEFT JOIN public.partner_clicks pc
    ON pc.clicked_at::date = d.day::date
    AND (_partner_id IS NULL OR pc.partner_id = _partner_id)
    AND (pc.user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = pc.user_id AND ur.role = 'admin'
    ))
    AND (pc.ip_address IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.excluded_ips ei
      WHERE ei.ip_address = pc.ip_address
    ))
  GROUP BY d.day
  ORDER BY d.day;
END;
$$;