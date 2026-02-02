-- Add is_listed column to blog_posts table
-- When false, the article is published but not shown in /blog listing
ALTER TABLE public.blog_posts 
ADD COLUMN is_listed boolean NOT NULL DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.blog_posts.is_listed IS 'When false, the article is published but not shown in /blog listing (useful for SEO landing pages)';