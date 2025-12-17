-- Add indexes for optimized query performance
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_date ON public.trips(date DESC);
CREATE INDEX IF NOT EXISTS idx_trips_user_date ON public.trips(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON public.trips(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON public.vehicles(user_id);

CREATE INDEX IF NOT EXISTS idx_locations_user_id ON public.locations(user_id);

CREATE INDEX IF NOT EXISTS idx_calendar_connections_user_id ON public.calendar_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_distance_cache_user_id ON public.distance_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_distance_cache_addresses ON public.distance_cache(user_id, start_address, end_address);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);