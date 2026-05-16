-- Add rating column to feedback
ALTER TABLE public.feedback
ADD COLUMN IF NOT EXISTS rating smallint
CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

-- Public aggregate function (no auth required, exposes only aggregated numbers)
CREATE OR REPLACE FUNCTION public.get_aggregate_rating()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'rating_value', COALESCE(ROUND(AVG(rating)::numeric, 2), 0),
    'rating_count', COUNT(rating),
    'best_rating', 5,
    'worst_rating', 1
  )
  FROM public.feedback
  WHERE rating IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_aggregate_rating() TO anon, authenticated;