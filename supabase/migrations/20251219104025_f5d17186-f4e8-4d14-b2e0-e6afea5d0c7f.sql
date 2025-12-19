-- Add is_electric column to vehicles table
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS is_electric BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.vehicles.is_electric IS 'Indicates if the vehicle is 100% electric (eligible for 20% IK bonus)';