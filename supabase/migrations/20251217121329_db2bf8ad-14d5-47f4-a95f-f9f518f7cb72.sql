-- Add missing columns to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS owner_first_name TEXT,
ADD COLUMN IF NOT EXISTS owner_last_name TEXT,
ADD COLUMN IF NOT EXISTS license_plate TEXT,
ADD COLUMN IF NOT EXISTS make TEXT,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS year INTEGER;

-- Migrate existing data: copy 'name' to 'model' for existing vehicles
UPDATE public.vehicles 
SET model = name 
WHERE model IS NULL;