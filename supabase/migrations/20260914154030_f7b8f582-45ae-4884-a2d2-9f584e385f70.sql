CREATE OR REPLACE FUNCTION public.get_aggregate_rating()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_avg numeric;
BEGIN
  SELECT count(*), avg(rating) INTO v_count, v_avg
  FROM public.reviews
  WHERE status = 'published';

  IF v_count < 5 THEN
    RETURN json_build_object('ratingValue', NULL, 'reviewCount', v_count, 'source', 'none');
  END IF;

  RETURN json_build_object(
    'ratingValue', round(v_avg, 1),
    'reviewCount', v_count,
    'source', 'reviews'
  );
END;
$$;