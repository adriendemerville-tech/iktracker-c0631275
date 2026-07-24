ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS user_monthly_report_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS user_monthly_report_last_sent_at timestamptz;