-- Create table to track download button clicks
CREATE TABLE public.download_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  clicked_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.download_clicks ENABLE ROW LEVEL SECURITY;

-- Users can insert their own clicks
CREATE POLICY "Users can insert their own clicks"
ON public.download_clicks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only admins can view all clicks
CREATE POLICY "Admins can view all clicks"
ON public.download_clicks
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to get download stats for admin dashboard
CREATE OR REPLACE FUNCTION public.get_download_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  total_clicks int;
  unique_users int;
  total_users_with_trips int;
  avg_clicks_per_user float;
  pct_users_clicked float;
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Total clicks
  SELECT COUNT(*) INTO total_clicks FROM public.download_clicks;
  
  -- Unique users who clicked
  SELECT COUNT(DISTINCT user_id) INTO unique_users FROM public.download_clicks;
  
  -- Total users (based on trips table)
  SELECT COUNT(DISTINCT user_id) INTO total_users_with_trips FROM public.trips;
  
  -- Average clicks per user (among those who clicked)
  IF unique_users > 0 THEN
    avg_clicks_per_user := total_clicks::float / unique_users::float;
  ELSE
    avg_clicks_per_user := 0;
  END IF;
  
  -- Percentage of users who clicked at least once
  IF total_users_with_trips > 0 THEN
    pct_users_clicked := (unique_users::float / total_users_with_trips::float) * 100;
  ELSE
    pct_users_clicked := 0;
  END IF;

  result := json_build_object(
    'total_clicks', total_clicks,
    'unique_users', unique_users,
    'avg_clicks_per_user', ROUND(avg_clicks_per_user::numeric, 2),
    'pct_users_clicked', ROUND(pct_users_clicked::numeric, 1)
  );

  RETURN result;
END;
$$;