-- Create enum for blog post status
CREATE TYPE public.blog_post_status AS ENUM ('draft', 'published', 'archived');

-- Create blog_api_keys table for third-party access
CREATE TABLE public.blog_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create blog_posts table
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  content TEXT NOT NULL DEFAULT '',
  featured_image_url TEXT,
  status blog_post_status NOT NULL DEFAULT 'draft',
  author_name TEXT,
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.blog_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- RLS for blog_api_keys: only admins can manage
CREATE POLICY "Admins can manage API keys"
ON public.blog_api_keys
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS for blog_posts: everyone can read published, admins can manage all
CREATE POLICY "Anyone can read published posts"
ON public.blog_posts
FOR SELECT
USING (status = 'published');

CREATE POLICY "Admins can manage all posts"
ON public.blog_posts
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for blog images
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true);

-- Storage policies for blog images
CREATE POLICY "Anyone can view blog images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'blog-images');

CREATE POLICY "Admins can upload blog images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update blog images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete blog images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();