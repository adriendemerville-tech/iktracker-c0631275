ALTER TABLE public.forum_profiles ADD COLUMN IF NOT EXISTS city text;

UPDATE public.forum_profiles
SET city = btrim(split_part(bio, '—', 1))
WHERE city IS NULL AND bio LIKE '%—%';

UPDATE public.forum_profiles p
SET avatar_url = '/founder-adrien-optimized.webp'
FROM auth.users u
WHERE u.id = p.user_id
  AND u.email = 'adriendemerville@gmail.com';