-- Add unique constraint for distance cache to enable upsert
ALTER TABLE public.distance_cache 
ADD CONSTRAINT unique_distance_cache_user_addresses 
UNIQUE (user_id, start_address, end_address);