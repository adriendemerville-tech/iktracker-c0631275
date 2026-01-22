-- Update the get_total_tours_count function to count trips from tour mode with distance > 1km
CREATE OR REPLACE FUNCTION public.get_total_tours_count(start_date timestamp with time zone DEFAULT NULL, end_date timestamp with time zone DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result integer;
BEGIN
  SELECT COUNT(*)::integer INTO result
  FROM trips
  WHERE tour_stops IS NOT NULL
    AND distance > 1
    AND deleted_at IS NULL
    AND (start_date IS NULL OR created_at >= start_date)
    AND (end_date IS NULL OR created_at <= end_date);
  
  RETURN result;
END;
$$;