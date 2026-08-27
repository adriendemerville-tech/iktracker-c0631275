-- Niveau à partir des points
CREATE OR REPLACE FUNCTION public.forum_level_for(_points integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _points >= 400 THEN 'expert'
    WHEN _points >= 150 THEN 'referent'
    WHEN _points >= 50 THEN 'habitue'
    WHEN _points >= 10 THEN 'contributeur'
    ELSE 'nouveau'
  END
$$;

-- Recalcul complet d'un profil forum
CREATE OR REPLACE FUNCTION public.forum_recalc_profile(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _discussions integer;
  _replies integer;
  _upvotes integer;
  _months integer;
  _points integer;
  _level text;
  _prev_level text;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;

  SELECT count(*) INTO _discussions FROM public.forum_discussions
    WHERE author_id = _user_id AND status = 'published';
  SELECT count(*) INTO _replies FROM public.forum_replies
    WHERE author_id = _user_id AND status = 'published';
  SELECT coalesce(sum(v.value), 0) INTO _upvotes
    FROM public.forum_votes v
    WHERE v.value = 1 AND (
      (v.target_type = 'discussion' AND v.target_id IN (SELECT id FROM public.forum_discussions WHERE author_id = _user_id))
      OR (v.target_type = 'reply' AND v.target_id IN (SELECT id FROM public.forum_replies WHERE author_id = _user_id))
    );

  SELECT level, greatest(0, (extract(epoch FROM (now() - member_since)) / 2592000)::integer)
    INTO _prev_level, _months
    FROM public.forum_profiles WHERE user_id = _user_id;

  IF _prev_level IS NULL THEN RETURN; END IF;

  _points := (_discussions * 5) + (_replies * 2) + _upvotes + _months;
  _level := public.forum_level_for(_points);

  UPDATE public.forum_profiles
     SET discussions_count = _discussions,
         replies_count = _replies,
         upvotes_received = _upvotes,
         points = _points,
         level = _level
   WHERE user_id = _user_id;

  IF _level IS DISTINCT FROM _prev_level THEN
    INSERT INTO public.forum_level_events (user_id, level, previous_level)
    VALUES (_user_id, _level, _prev_level);
  END IF;
END;
$$;

-- Trigger discussions : recalcul auteur
CREATE OR REPLACE FUNCTION public.forum_discussions_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.forum_recalc_profile(OLD.author_id);
    RETURN OLD;
  END IF;
  PERFORM public.forum_recalc_profile(NEW.author_id);
  IF TG_OP = 'UPDATE' AND NEW.author_id IS DISTINCT FROM OLD.author_id THEN
    PERFORM public.forum_recalc_profile(OLD.author_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER forum_discussions_profile_sync
AFTER INSERT OR DELETE OR UPDATE OF status, author_id ON public.forum_discussions
FOR EACH ROW EXECUTE FUNCTION public.forum_discussions_after_change();

-- Trigger réponses : compteurs discussion + recalcul auteur
CREATE OR REPLACE FUNCTION public.forum_replies_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _discussion uuid;
BEGIN
  _discussion := coalesce(NEW.discussion_id, OLD.discussion_id);

  UPDATE public.forum_discussions d
     SET reply_count = (SELECT count(*) FROM public.forum_replies r
                         WHERE r.discussion_id = d.id AND r.status = 'published'),
         last_activity_at = greatest(d.created_at,
           coalesce((SELECT max(r.created_at) FROM public.forum_replies r
                      WHERE r.discussion_id = d.id AND r.status = 'published'), d.created_at))
   WHERE d.id = _discussion;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.forum_recalc_profile(OLD.author_id);
    RETURN OLD;
  END IF;
  PERFORM public.forum_recalc_profile(NEW.author_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER forum_replies_sync
AFTER INSERT OR DELETE OR UPDATE OF status, author_id ON public.forum_replies
FOR EACH ROW EXECUTE FUNCTION public.forum_replies_after_change();

-- Trigger votes : score de la cible + recalcul auteur de la cible
CREATE OR REPLACE FUNCTION public.forum_votes_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _type text;
  _id uuid;
  _score integer;
  _author uuid;
BEGIN
  _type := coalesce(NEW.target_type, OLD.target_type);
  _id := coalesce(NEW.target_id, OLD.target_id);

  SELECT coalesce(sum(value), 0) INTO _score
    FROM public.forum_votes WHERE target_type = _type AND target_id = _id;

  IF _type = 'discussion' THEN
    UPDATE public.forum_discussions SET vote_score = _score WHERE id = _id
      RETURNING author_id INTO _author;
  ELSE
    UPDATE public.forum_replies SET vote_score = _score WHERE id = _id
      RETURNING author_id INTO _author;
  END IF;

  PERFORM public.forum_recalc_profile(_author);
  RETURN coalesce(NEW, OLD);
END;
$$;

CREATE TRIGGER forum_votes_sync
AFTER INSERT OR DELETE OR UPDATE ON public.forum_votes
FOR EACH ROW EXECUTE FUNCTION public.forum_votes_after_change();

-- Statistiques publiques du forum
CREATE OR REPLACE FUNCTION public.get_forum_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'discussions', (SELECT count(*) FROM public.forum_discussions WHERE status = 'published'),
    'replies', (SELECT count(*) FROM public.forum_replies WHERE status = 'published'),
    'members', (SELECT count(*) FROM public.forum_profiles),
    'active_7d', (SELECT count(DISTINCT author_id) FROM (
        SELECT author_id, created_at FROM public.forum_discussions WHERE status = 'published'
        UNION ALL
        SELECT author_id, created_at FROM public.forum_replies WHERE status = 'published'
      ) a WHERE a.created_at > now() - interval '7 days')
  )
$$;