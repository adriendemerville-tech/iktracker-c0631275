WITH n AS (
  SELECT id, user_id, date, created_at,
    regexp_replace(lower(translate(coalesce(start_location,''), 'àâäéèêëîïôöùûüç', 'aaaeeeeiioouuuc')), '[^a-z0-9]+', '', 'g') AS s,
    regexp_replace(lower(translate(coalesce(end_location,''), 'àâäéèêëîïôöùûüç', 'aaaeeeeiioouuuc')), '[^a-z0-9]+', '', 'g') AS e
  FROM public.trips WHERE deleted_at IS NULL AND status='pending_location'
),
ranked AS (
  SELECT id, row_number() OVER (PARTITION BY user_id, date, s, e ORDER BY created_at ASC) rn
  FROM n
)
UPDATE public.trips t SET deleted_at = now()
FROM ranked r
WHERE t.id = r.id AND r.rn > 1;