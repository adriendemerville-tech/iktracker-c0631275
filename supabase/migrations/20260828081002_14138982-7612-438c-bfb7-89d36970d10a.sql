UPDATE public.forum_profiles
SET avatar_url = '/founder-adrien-optimized.webp',
    city = COALESCE(city, 'Saint-Rémy-de-Provence')
WHERE pseudo = 'Adrien de Volontat';