ALTER TABLE public.recurring_trips
  ADD COLUMN IF NOT EXISTS weeks_duration integer,
  ADD COLUMN IF NOT EXISTS active_months integer[];