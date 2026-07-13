CREATE INDEX IF NOT EXISTS idx_marketing_analytics_event_type_created_at
  ON public.marketing_analytics (event_type, created_at DESC);