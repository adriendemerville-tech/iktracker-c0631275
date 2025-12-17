-- Create a table to cache distances between locations
CREATE TABLE public.distance_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  start_address TEXT NOT NULL,
  end_address TEXT NOT NULL,
  distance DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index on user + addresses to prevent duplicates
CREATE UNIQUE INDEX idx_distance_cache_unique ON public.distance_cache (user_id, start_address, end_address);

-- Enable RLS
ALTER TABLE public.distance_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own cached distances" 
ON public.distance_cache 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cached distances" 
ON public.distance_cache 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cached distances" 
ON public.distance_cache 
FOR DELETE 
USING (auth.uid() = user_id);