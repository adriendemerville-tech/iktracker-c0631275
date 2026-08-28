ALTER TABLE public.forum_discussions ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false;
ALTER TABLE public.forum_replies ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.forum_bot_profiles (
  user_id uuid PRIMARY KEY,
  disc_color text NOT NULL CHECK (disc_color IN ('bleu','vert','jaune','rouge')),
  age_band text NOT NULL CHECK (age_band IN ('25-35','35-50','50-65')),
  register text NOT NULL CHECK (register IN ('soutenu','courant','familier')),
  typo_rate numeric NOT NULL DEFAULT 0 CHECK (typo_rate >= 0 AND typo_rate <= 0.12),
  verbosity text NOT NULL DEFAULT 'moyen' CHECK (verbosity IN ('court','moyen','long')),
  signature text,
  active_hours integer[] NOT NULL DEFAULT '{8,9,12,18,19,21}',
  active_days integer[] NOT NULL DEFAULT '{1,2,3,4,5}',
  activity_weight numeric NOT NULL DEFAULT 1 CHECK (activity_weight >= 0),
  lifecycle text NOT NULL DEFAULT 'actif' CHECK (lifecycle IN ('montant','actif','essoufle','dormant')),
  memory jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_discussion_at timestamptz,
  last_reply_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.forum_bot_profiles TO authenticated;
GRANT ALL ON public.forum_bot_profiles TO service_role;
ALTER TABLE public.forum_bot_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bot profiles admin read" ON public.forum_bot_profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.forum_bot_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('discussion','reply','vote','skip')),
  bot_user_id uuid,
  target_type text,
  target_id uuid,
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','rejected','error')),
  reason text,
  model text,
  output text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.forum_bot_runs TO authenticated;
GRANT ALL ON public.forum_bot_runs TO service_role;
ALTER TABLE public.forum_bot_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bot runs admin read" ON public.forum_bot_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_forum_bot_runs_created ON public.forum_bot_runs (created_at DESC);

CREATE TRIGGER trg_forum_bot_profiles_updated
  BEFORE UPDATE ON public.forum_bot_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Marque les contenus déjà créés par les profils fictifs
UPDATE public.forum_discussions d SET is_bot = true
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = d.author_id);
UPDATE public.forum_replies r SET is_bot = true
WHERE r.author_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = r.author_id);

-- Initialise les personnalités des profils fictifs existants
INSERT INTO public.forum_bot_profiles (
  user_id, disc_color, age_band, register, typo_rate, verbosity,
  active_hours, active_days, activity_weight, lifecycle, memory
)
SELECT
  p.user_id,
  (ARRAY['bleu','vert','jaune','rouge'])[1 + (abs(('x'||substr(md5(p.user_id::text),1,8))::bit(32)::int) % 4)],
  (ARRAY['25-35','35-50','50-65'])[1 + (abs(('x'||substr(md5(p.user_id::text||'a'),1,8))::bit(32)::int) % 3)],
  (ARRAY['soutenu','courant','familier'])[1 + (abs(('x'||substr(md5(p.user_id::text||'b'),1,8))::bit(32)::int) % 3)],
  ROUND((abs(('x'||substr(md5(p.user_id::text||'c'),1,8))::bit(32)::int) % 9)::numeric / 100, 2),
  (ARRAY['court','moyen','long'])[1 + (abs(('x'||substr(md5(p.user_id::text||'d'),1,8))::bit(32)::int) % 3)],
  (CASE (abs(('x'||substr(md5(p.user_id::text||'e'),1,8))::bit(32)::int) % 4)
     WHEN 0 THEN ARRAY[7,8,12,18,20]
     WHEN 1 THEN ARRAY[9,13,17,21,22]
     WHEN 2 THEN ARRAY[6,7,11,19,20]
     ELSE ARRAY[10,12,14,18,23] END),
  (CASE (abs(('x'||substr(md5(p.user_id::text||'f'),1,8))::bit(32)::int) % 4)
     WHEN 0 THEN ARRAY[1,2,3,4,5]
     WHEN 1 THEN ARRAY[1,3,5,6]
     WHEN 2 THEN ARRAY[2,4,5,6,0]
     ELSE ARRAY[1,2,3,4,5,6] END),
  ROUND(0.3 + ((abs(('x'||substr(md5(p.user_id::text||'g'),1,8))::bit(32)::int) % 170)::numeric / 100), 2),
  (ARRAY['montant','actif','actif','essoufle'])[1 + (abs(('x'||substr(md5(p.user_id::text||'h'),1,8))::bit(32)::int) % 4)],
  jsonb_build_object('bio', COALESCE(p.bio, ''), 'persona', COALESCE(p.persona, 'autre'))
FROM public.forum_profiles p
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.user_id)
ON CONFLICT (user_id) DO NOTHING;