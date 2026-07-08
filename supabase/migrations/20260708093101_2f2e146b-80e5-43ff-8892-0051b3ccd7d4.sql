ALTER TABLE public.user_preferences 
  ADD COLUMN IF NOT EXISTS calendar_import_mode text NOT NULL DEFAULT 'individual';

ALTER TABLE public.user_preferences 
  DROP CONSTRAINT IF EXISTS user_preferences_calendar_import_mode_check;

ALTER TABLE public.user_preferences 
  ADD CONSTRAINT user_preferences_calendar_import_mode_check 
  CHECK (calendar_import_mode IN ('individual','tour'));