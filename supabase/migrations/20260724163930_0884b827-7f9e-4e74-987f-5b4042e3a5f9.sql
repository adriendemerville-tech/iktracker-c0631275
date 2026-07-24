ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS accountant_auto_send boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accountant_frequency text NOT NULL DEFAULT 'monthly' CHECK (accountant_frequency IN ('monthly','quarterly','yearly')),
  ADD COLUMN IF NOT EXISTS accountant_send_day integer NOT NULL DEFAULT 5 CHECK (accountant_send_day BETWEEN 1 AND 28),
  ADD COLUMN IF NOT EXISTS accountant_last_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_user_preferences_accountant_auto
  ON public.user_preferences (accountant_auto_send)
  WHERE accountant_auto_send = true;