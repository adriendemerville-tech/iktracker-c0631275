-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  fiscal_power INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create locations table
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  type TEXT NOT NULL DEFAULT 'other',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trips table
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_location TEXT NOT NULL,
  end_location TEXT NOT NULL,
  distance DOUBLE PRECISION NOT NULL,
  purpose TEXT,
  round_trip BOOLEAN NOT NULL DEFAULT false,
  ik_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicles
CREATE POLICY "Users can view their own vehicles" ON public.vehicles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own vehicles" ON public.vehicles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vehicles" ON public.vehicles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own vehicles" ON public.vehicles
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for locations
CREATE POLICY "Users can view their own locations" ON public.locations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own locations" ON public.locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own locations" ON public.locations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own locations" ON public.locations
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for trips
CREATE POLICY "Users can view their own trips" ON public.trips
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own trips" ON public.trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own trips" ON public.trips
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own trips" ON public.trips
  FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for vehicles updated_at
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_vehicles_user_id ON public.vehicles(user_id);
CREATE INDEX idx_locations_user_id ON public.locations(user_id);
CREATE INDEX idx_trips_user_id ON public.trips(user_id);
CREATE INDEX idx_trips_vehicle_id ON public.trips(vehicle_id);
CREATE INDEX idx_trips_date ON public.trips(date);