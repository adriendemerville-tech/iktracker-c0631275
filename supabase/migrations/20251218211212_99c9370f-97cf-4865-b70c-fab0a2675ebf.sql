-- Create table for tracking shares
CREATE TABLE public.share_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_km INTEGER DEFAULT 0,
  total_ik NUMERIC(10,2) DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own share events
CREATE POLICY "Users can insert their own share events"
ON public.share_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all share events
CREATE POLICY "Admins can view all share events"
ON public.share_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to get share stats for admin
CREATE OR REPLACE FUNCTION public.get_share_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  total_shares int;
  unique_sharers int;
  total_users_with_trips int;
  pct_users_shared float;
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Total shares (excluding admins)
  SELECT COUNT(*) INTO total_shares 
  FROM public.share_events se
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = se.user_id AND ur.role = 'admin'
  );
  
  -- Unique users who shared (excluding admins)
  SELECT COUNT(DISTINCT se.user_id) INTO unique_sharers 
  FROM public.share_events se
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = se.user_id AND ur.role = 'admin'
  );
  
  -- Total users based on trips table (excluding admins)
  SELECT COUNT(DISTINCT t.user_id) INTO total_users_with_trips 
  FROM public.trips t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = t.user_id AND ur.role = 'admin'
  );
  
  -- Percentage of users who shared at least once
  IF total_users_with_trips > 0 THEN
    pct_users_shared := (unique_sharers::float / total_users_with_trips::float) * 100;
  ELSE
    pct_users_shared := 0;
  END IF;

  result := json_build_object(
    'total_shares', total_shares,
    'unique_sharers', unique_sharers,
    'pct_users_shared', ROUND(pct_users_shared::numeric, 1)
  );

  RETURN result;
END;
$$;

-- Function to get shares by day
CREATE OR REPLACE FUNCTION public.get_shares_by_day(days_back integer DEFAULT 30)
RETURNS TABLE(day date, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    d.day::date,
    COUNT(se.id)
  FROM generate_series(
    CURRENT_DATE - days_back,
    CURRENT_DATE,
    '1 day'::interval
  ) AS d(day)
  LEFT JOIN public.share_events se ON se.shared_at::date = d.day::date
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = se.user_id AND ur.role = 'admin'
    )
  GROUP BY d.day
  ORDER BY d.day;
END;
$$;