WITH del AS (
  DELETE FROM public.indexing_submissions
  WHERE provider = 'indexnow' AND status = 'error' AND http_status = 429
  RETURNING url
)
INSERT INTO public.indexing_submissions (url, provider, status, http_status, response, submitted_at)
SELECT 'https://iktracker.fr/', 'indexnow', 'error', 429,
       'Lot regroupé : ' || count(*) || ' URLs en 429 (quota dépassé) — rejouées automatiquement au prochain run',
       now()
FROM del
HAVING count(*) > 0;