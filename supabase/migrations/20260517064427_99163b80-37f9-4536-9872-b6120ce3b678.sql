-- Retro-sync orphan persona responses from survey
UPDATE public.user_preferences SET persona = 'commercial_immobilier'
  WHERE user_id IN ('e9334d15-992a-4197-85c8-6ef863f0f78b', '2c8396ee-f628-4ebe-8b86-a0a87537a04b')
  AND (persona IS NULL OR persona = 'undefined');

UPDATE public.user_preferences SET persona = 'artisan_btp'
  WHERE user_id = '12ab7b1f-ef5c-4644-8c0f-1536fc36615d'
  AND (persona IS NULL OR persona = 'undefined');

INSERT INTO public.user_preferences (user_id, persona)
SELECT v.user_id, v.persona FROM (VALUES
  ('e9334d15-992a-4197-85c8-6ef863f0f78b'::uuid, 'commercial_immobilier'),
  ('2c8396ee-f628-4ebe-8b86-a0a87537a04b'::uuid, 'commercial_immobilier'),
  ('12ab7b1f-ef5c-4644-8c0f-1536fc36615d'::uuid, 'artisan_btp')
) AS v(user_id, persona)
ON CONFLICT (user_id) DO NOTHING;