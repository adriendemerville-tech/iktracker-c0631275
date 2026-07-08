ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS ik_rate_override TEXT NOT NULL DEFAULT 'auto'
CHECK (ik_rate_override IN ('auto','tier2','tier3'));