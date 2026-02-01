-- Table pour tracker les tentatives d'import Google Takeout
CREATE TABLE public.takeout_import_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'started', -- 'started', 'success', 'failed'
  trips_imported integer DEFAULT 0,
  total_km numeric DEFAULT 0,
  total_ik numeric DEFAULT 0,
  error_message text
);

-- Enable RLS
ALTER TABLE public.takeout_import_attempts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own import attempts"
ON public.takeout_import_attempts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own import attempts"
ON public.takeout_import_attempts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all import attempts"
ON public.takeout_import_attempts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Function to get takeout import stats for admin
CREATE OR REPLACE FUNCTION public.get_takeout_import_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  total_attempts int;
  successful_imports int;
  unique_users_imported int;
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Total attempts (excluding admins)
  SELECT COUNT(*) INTO total_attempts
  FROM public.takeout_import_attempts tia
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = tia.user_id AND ur.role = 'admin'
  );

  -- Successful imports (excluding admins)
  SELECT COUNT(*) INTO successful_imports
  FROM public.takeout_import_attempts tia
  WHERE tia.status = 'success'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = tia.user_id AND ur.role = 'admin'
    );

  -- Unique users with successful imports (excluding admins)
  SELECT COUNT(DISTINCT tia.user_id) INTO unique_users_imported
  FROM public.takeout_import_attempts tia
  WHERE tia.status = 'success'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = tia.user_id AND ur.role = 'admin'
    );

  result := json_build_object(
    'total_attempts', COALESCE(total_attempts, 0),
    'successful_imports', COALESCE(successful_imports, 0),
    'unique_users_imported', COALESCE(unique_users_imported, 0)
  );

  RETURN result;
END;
$$;

-- Update get_user_stats to include takeout import info
CREATE OR REPLACE FUNCTION public.get_user_stats(_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  user_trips_count int;
  user_total_km float;
  user_total_ik float;
  user_vehicles_count int;
  user_tours_count int;
  user_shares_count int;
  first_trip_date date;
  last_trip_date date;
  has_takeout_import boolean;
  takeout_import_date timestamp with time zone;
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Get trip stats
  SELECT 
    COUNT(*),
    COALESCE(SUM(distance), 0),
    COALESCE(SUM(ik_amount), 0),
    MIN(date),
    MAX(date)
  INTO user_trips_count, user_total_km, user_total_ik, first_trip_date, last_trip_date
  FROM public.trips
  WHERE user_id = _user_id AND deleted_at IS NULL;

  -- Get vehicles count
  SELECT COUNT(*) INTO user_vehicles_count
  FROM public.vehicles
  WHERE user_id = _user_id;

  -- Get tours count (trips with tour_stops)
  SELECT COUNT(*) INTO user_tours_count
  FROM public.trips
  WHERE user_id = _user_id 
    AND tour_stops IS NOT NULL 
    AND deleted_at IS NULL;

  -- Get shares count
  SELECT COUNT(*) INTO user_shares_count
  FROM public.share_events
  WHERE user_id = _user_id;

  -- Check for successful takeout import
  SELECT 
    EXISTS(SELECT 1 FROM public.takeout_import_attempts WHERE user_id = _user_id AND status = 'success'),
    (SELECT created_at FROM public.takeout_import_attempts WHERE user_id = _user_id AND status = 'success' ORDER BY created_at DESC LIMIT 1)
  INTO has_takeout_import, takeout_import_date;

  result := json_build_object(
    'total_trips', user_trips_count,
    'total_km', ROUND(user_total_km::numeric, 1),
    'total_ik', ROUND(user_total_ik::numeric, 2),
    'vehicles_count', user_vehicles_count,
    'tours_count', user_tours_count,
    'shares_count', user_shares_count,
    'first_trip_date', first_trip_date,
    'last_trip_date', last_trip_date,
    'has_takeout_import', COALESCE(has_takeout_import, false),
    'takeout_import_date', takeout_import_date
  );

  RETURN result;
END;
$$;