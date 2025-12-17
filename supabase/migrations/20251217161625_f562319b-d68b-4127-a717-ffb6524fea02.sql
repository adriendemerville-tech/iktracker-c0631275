-- Create feedback table
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users can create their own feedback
CREATE POLICY "Users can create feedback"
ON public.feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Create storage bucket for feedback images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('feedback-images', 'feedback-images', true);

-- Allow authenticated users to upload feedback images
CREATE POLICY "Authenticated users can upload feedback images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'feedback-images' AND auth.role() = 'authenticated');

-- Allow public read access to feedback images
CREATE POLICY "Public can view feedback images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'feedback-images');