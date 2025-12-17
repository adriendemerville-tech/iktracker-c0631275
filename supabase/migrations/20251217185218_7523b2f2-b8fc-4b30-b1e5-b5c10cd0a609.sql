-- Add tour_stops column to store tour stop details as JSON
ALTER TABLE public.trips 
ADD COLUMN tour_stops jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.trips.tour_stops IS 'JSON array of tour stops with id, timestamp, lat, lng, address, city, duration';