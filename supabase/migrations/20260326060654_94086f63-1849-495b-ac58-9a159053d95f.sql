
-- 1. Drop unnecessary WITH CHECK (true) policies on tables only accessed by service role
-- autopilot_events: edge functions use service_role_key (bypasses RLS)
DROP POLICY IF EXISTS "Service can insert autopilot events" ON public.autopilot_events;

-- error_logs: edge functions use service_role_key
DROP POLICY IF EXISTS "Backend can insert error logs" ON public.error_logs;

-- vehicle_cache: edge function vehicle-lookup uses service_role_key
DROP POLICY IF EXISTS "Service can insert vehicle cache" ON public.vehicle_cache;

-- 2. Tighten remaining anonymous INSERT policies with minimal validation

-- marketing_analytics: anonymous frontend tracking (legitimate, but add validation)
DROP POLICY IF EXISTS "Allow anonymous inserts for marketing tracking" ON public.marketing_analytics;
CREATE POLICY "Allow anonymous inserts for marketing tracking"
  ON public.marketing_analytics FOR INSERT
  TO public
  WITH CHECK (event_type IS NOT NULL AND page IS NOT NULL);

-- affiliate_uses: anonymous frontend tracking
DROP POLICY IF EXISTS "Anyone can insert affiliate uses" ON public.affiliate_uses;
CREATE POLICY "Anyone can insert affiliate uses"
  ON public.affiliate_uses FOR INSERT
  TO public
  WITH CHECK (affiliate_code_id IS NOT NULL);
