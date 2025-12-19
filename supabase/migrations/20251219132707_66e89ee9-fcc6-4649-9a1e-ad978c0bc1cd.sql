-- Change the foreign key from CASCADE to RESTRICT
-- This will prevent vehicle deletion if trips are attached

ALTER TABLE public.trips 
DROP CONSTRAINT trips_vehicle_id_fkey;

ALTER TABLE public.trips 
ADD CONSTRAINT trips_vehicle_id_fkey 
FOREIGN KEY (vehicle_id) 
REFERENCES public.vehicles(id) 
ON DELETE RESTRICT;