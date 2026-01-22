-- Ajouter une colonne pour l'ordre d'affichage des articles de blog
ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Initialiser l'ordre en fonction de la date de publication (les plus récents en premier)
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY COALESCE(published_at, created_at) DESC) as rn
  FROM public.blog_posts
)
UPDATE public.blog_posts 
SET display_order = ordered.rn
FROM ordered
WHERE blog_posts.id = ordered.id;

-- Créer un index pour les requêtes triées par ordre d'affichage
CREATE INDEX IF NOT EXISTS idx_blog_posts_display_order ON public.blog_posts(display_order);