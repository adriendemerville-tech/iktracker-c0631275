-- Create frequent_destinations table for keyword-to-address mapping
CREATE TABLE public.frequent_destinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  keyword TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.frequent_destinations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own frequent destinations" 
ON public.frequent_destinations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own frequent destinations" 
ON public.frequent_destinations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own frequent destinations" 
ON public.frequent_destinations FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own frequent destinations" 
ON public.frequent_destinations FOR DELETE 
USING (auth.uid() = user_id);

-- Add unique constraint on user_id + keyword
CREATE UNIQUE INDEX idx_frequent_destinations_user_keyword 
ON public.frequent_destinations (user_id, LOWER(keyword));

-- Add status column to trips table
ALTER TABLE public.trips 
ADD COLUMN status TEXT NOT NULL DEFAULT 'validated' 
CHECK (status IN ('validated', 'pending_location'));