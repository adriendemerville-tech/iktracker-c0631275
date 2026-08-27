-- ============ FORUM : catégories ============
CREATE TABLE public.forum_categories (
  slug text PRIMARY KEY,
  label text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.forum_categories TO anon, authenticated;
GRANT ALL ON public.forum_categories TO service_role;
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_categories_public_read" ON public.forum_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "forum_categories_admin_write" ON public.forum_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.forum_categories (slug, label, description, sort_order) VALUES
  ('finances', 'Finances', 'Gestion, trésorerie et frais professionnels des indépendants.', 1),
  ('urssaf', 'URSSAF', 'Cotisations, contrôles et barèmes URSSAF.', 2),
  ('salarie', 'Salarié', 'Remboursement des frais kilométriques en tant que salarié.', 3),
  ('retraite', 'Retraite', 'Retraite des indépendants et des professions libérales.', 4),
  ('complementaire-sante', 'Complémentaire santé', 'Couverture santé des travailleurs non salariés.', 5),
  ('mutuelle', 'Mutuelle', 'Choix et fiscalité des contrats de mutuelle.', 6),
  ('vehicules', 'Véhicules', 'Choix du véhicule, électrique, puissance fiscale, entretien.', 7),
  ('imposition', 'Imposition', 'Frais réels, déclaration et optimisation fiscale.', 8),
  ('facturation-electronique', 'Facturation électronique', 'Réforme de la facturation électronique et outils.', 9);

-- ============ FORUM : profils ============
CREATE TABLE public.forum_profiles (
  user_id uuid PRIMARY KEY,
  pseudo text NOT NULL,
  avatar_url text,
  bio text,
  persona text,
  level text NOT NULL DEFAULT 'nouveau',
  points integer NOT NULL DEFAULT 0,
  discussions_count integer NOT NULL DEFAULT 0,
  replies_count integer NOT NULL DEFAULT 0,
  upvotes_received integer NOT NULL DEFAULT 0,
  member_since timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_profiles_pseudo_len CHECK (char_length(pseudo) BETWEEN 3 AND 30)
);
CREATE UNIQUE INDEX forum_profiles_pseudo_key ON public.forum_profiles (lower(pseudo));
GRANT SELECT ON public.forum_profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.forum_profiles TO authenticated;
GRANT ALL ON public.forum_profiles TO service_role;
ALTER TABLE public.forum_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_profiles_public_read" ON public.forum_profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "forum_profiles_insert_own" ON public.forum_profiles FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "forum_profiles_update_own" ON public.forum_profiles FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE TRIGGER forum_profiles_touch BEFORE UPDATE ON public.forum_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ FORUM : discussions ============
CREATE TABLE public.forum_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  body text NOT NULL,
  category_slug text NOT NULL REFERENCES public.forum_categories(slug),
  meta_description text,
  status text NOT NULL DEFAULT 'published',
  seo_indexable boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  best_reply_id uuid,
  reply_count integer NOT NULL DEFAULT 0,
  vote_score integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  attachment_count integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_discussions_title_len CHECK (char_length(title) BETWEEN 10 AND 120),
  CONSTRAINT forum_discussions_status_valid CHECK (status IN ('published','pending','hidden','deleted'))
);
CREATE INDEX forum_discussions_public_idx ON public.forum_discussions (status, last_activity_at DESC);
CREATE INDEX forum_discussions_category_idx ON public.forum_discussions (category_slug, last_activity_at DESC);
CREATE INDEX forum_discussions_author_idx ON public.forum_discussions (author_id);
CREATE INDEX forum_discussions_sitemap_idx ON public.forum_discussions (seo_indexable, last_activity_at DESC);

GRANT SELECT ON public.forum_discussions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_discussions TO authenticated;
GRANT ALL ON public.forum_discussions TO service_role;
ALTER TABLE public.forum_discussions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_discussions_public_read" ON public.forum_discussions FOR SELECT TO anon, authenticated
  USING (status = 'published');
CREATE POLICY "forum_discussions_owner_read" ON public.forum_discussions FOR SELECT TO authenticated
  USING ((select auth.uid()) = author_id);
CREATE POLICY "forum_discussions_admin_read" ON public.forum_discussions FOR SELECT TO authenticated
  USING (public.has_admin_or_viewer_role((select auth.uid())));
CREATE POLICY "forum_discussions_insert_own" ON public.forum_discussions FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = author_id);
CREATE POLICY "forum_discussions_update_own" ON public.forum_discussions FOR UPDATE TO authenticated
  USING ((select auth.uid()) = author_id) WITH CHECK ((select auth.uid()) = author_id);
CREATE POLICY "forum_discussions_admin_write" ON public.forum_discussions FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin')) WITH CHECK (public.has_role((select auth.uid()), 'admin'));
CREATE TRIGGER forum_discussions_touch BEFORE UPDATE ON public.forum_discussions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ FORUM : réponses ============
CREATE TABLE public.forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id uuid NOT NULL REFERENCES public.forum_discussions(id) ON DELETE CASCADE,
  author_id uuid,
  parent_reply_id uuid REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_ai boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'published',
  vote_score integer NOT NULL DEFAULT 0,
  attachment_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_replies_status_valid CHECK (status IN ('published','pending','hidden','deleted'))
);
CREATE INDEX forum_replies_discussion_idx ON public.forum_replies (discussion_id, created_at);
CREATE INDEX forum_replies_author_idx ON public.forum_replies (author_id);
GRANT SELECT ON public.forum_replies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_replies TO authenticated;
GRANT ALL ON public.forum_replies TO service_role;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_replies_public_read" ON public.forum_replies FOR SELECT TO anon, authenticated
  USING (status = 'published');
CREATE POLICY "forum_replies_owner_read" ON public.forum_replies FOR SELECT TO authenticated
  USING ((select auth.uid()) = author_id);
CREATE POLICY "forum_replies_admin_read" ON public.forum_replies FOR SELECT TO authenticated
  USING (public.has_admin_or_viewer_role((select auth.uid())));
CREATE POLICY "forum_replies_insert_own" ON public.forum_replies FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = author_id);
CREATE POLICY "forum_replies_update_own" ON public.forum_replies FOR UPDATE TO authenticated
  USING ((select auth.uid()) = author_id) WITH CHECK ((select auth.uid()) = author_id);
CREATE POLICY "forum_replies_admin_write" ON public.forum_replies FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin')) WITH CHECK (public.has_role((select auth.uid()), 'admin'));
CREATE TRIGGER forum_replies_touch BEFORE UPDATE ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.forum_discussions
  ADD CONSTRAINT forum_discussions_best_reply_fk FOREIGN KEY (best_reply_id)
  REFERENCES public.forum_replies(id) ON DELETE SET NULL;

-- ============ FORUM : votes ============
CREATE TABLE public.forum_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('discussion','reply')),
  target_id uuid NOT NULL,
  value smallint NOT NULL CHECK (value IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);
CREATE INDEX forum_votes_target_idx ON public.forum_votes (target_type, target_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_votes TO authenticated;
GRANT ALL ON public.forum_votes TO service_role;
ALTER TABLE public.forum_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_votes_own" ON public.forum_votes FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- ============ FORUM : discussions enregistrées ============
CREATE TABLE public.forum_saved_posts (
  user_id uuid NOT NULL,
  discussion_id uuid NOT NULL REFERENCES public.forum_discussions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, discussion_id)
);
GRANT SELECT, INSERT, DELETE ON public.forum_saved_posts TO authenticated;
GRANT ALL ON public.forum_saved_posts TO service_role;
ALTER TABLE public.forum_saved_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_saved_own" ON public.forum_saved_posts FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- ============ FORUM : pièces jointes ============
CREATE TABLE public.forum_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  discussion_id uuid REFERENCES public.forum_discussions(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('image','pdf')),
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_attachments_target CHECK (num_nonnulls(discussion_id, reply_id) = 1),
  CONSTRAINT forum_attachments_size CHECK (size_bytes > 0 AND size_bytes <= 5242880)
);
CREATE INDEX forum_attachments_discussion_idx ON public.forum_attachments (discussion_id);
CREATE INDEX forum_attachments_reply_idx ON public.forum_attachments (reply_id);
GRANT SELECT ON public.forum_attachments TO anon;
GRANT SELECT, INSERT, DELETE ON public.forum_attachments TO authenticated;
GRANT ALL ON public.forum_attachments TO service_role;
ALTER TABLE public.forum_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_attachments_public_read" ON public.forum_attachments FOR SELECT TO anon, authenticated
  USING (is_approved = true);
CREATE POLICY "forum_attachments_owner" ON public.forum_attachments FOR ALL TO authenticated
  USING ((select auth.uid()) = owner_id) WITH CHECK ((select auth.uid()) = owner_id);

-- ============ FORUM : signalements et modération ============
CREATE TABLE public.forum_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid,
  target_type text NOT NULL CHECK (target_type IN ('discussion','reply')),
  target_id uuid NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.forum_reports TO authenticated;
GRANT ALL ON public.forum_reports TO service_role;
ALTER TABLE public.forum_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_reports_insert_own" ON public.forum_reports FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = reporter_id);
CREATE POLICY "forum_reports_admin_all" ON public.forum_reports FOR ALL TO authenticated
  USING (public.has_admin_or_viewer_role((select auth.uid()))) WITH CHECK (public.has_role((select auth.uid()), 'admin'));

CREATE TABLE public.forum_moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  action text NOT NULL,
  reason text,
  categories jsonb,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.forum_moderation_log TO authenticated;
GRANT ALL ON public.forum_moderation_log TO service_role;
ALTER TABLE public.forum_moderation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_moderation_log_admin_read" ON public.forum_moderation_log FOR SELECT TO authenticated
  USING (public.has_admin_or_viewer_role((select auth.uid())));

-- ============ FORUM : événements de niveau ============
CREATE TABLE public.forum_level_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  level text NOT NULL,
  previous_level text,
  created_at timestamptz NOT NULL DEFAULT now(),
  seen_at timestamptz
);
CREATE INDEX forum_level_events_unseen_idx ON public.forum_level_events (user_id, seen_at);
GRANT SELECT, UPDATE ON public.forum_level_events TO authenticated;
GRANT ALL ON public.forum_level_events TO service_role;
ALTER TABLE public.forum_level_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_level_events_own" ON public.forum_level_events FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
CREATE POLICY "forum_level_events_own_update" ON public.forum_level_events FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);