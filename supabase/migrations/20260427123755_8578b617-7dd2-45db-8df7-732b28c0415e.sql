ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS tutorial_completed_at TIMESTAMP WITH TIME ZONE;