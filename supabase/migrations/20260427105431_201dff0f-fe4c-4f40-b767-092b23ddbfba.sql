ALTER TYPE public.blog_post_status ADD VALUE IF NOT EXISTS 'deleted';

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_blog_posts_deleted_at ON public.blog_posts(deleted_at);