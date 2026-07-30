ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS start_address text,
  ADD COLUMN IF NOT EXISTS end_address text,
  ADD COLUMN IF NOT EXISTS start_lat double precision,
  ADD COLUMN IF NOT EXISTS start_lng double precision,
  ADD COLUMN IF NOT EXISTS end_lat double precision,
  ADD COLUMN IF NOT EXISTS end_lng double precision;