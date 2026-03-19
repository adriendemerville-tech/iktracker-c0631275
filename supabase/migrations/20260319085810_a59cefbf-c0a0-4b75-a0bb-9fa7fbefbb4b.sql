
-- Add viewer to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

-- Add phone_number to feedback table
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS phone_number text;

-- Function to cleanup phone numbers older than 7 days
CREATE OR REPLACE FUNCTION public.cleanup_old_phone_numbers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.feedback 
  SET phone_number = NULL 
  WHERE phone_number IS NOT NULL 
    AND created_at < now() - interval '7 days';
END;
$$;
