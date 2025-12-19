-- Make vehicle_id nullable and change foreign key to SET NULL on delete
ALTER TABLE public.trips 
DROP CONSTRAINT trips_vehicle_id_fkey;

ALTER TABLE public.trips 
ALTER COLUMN vehicle_id DROP NOT NULL;

ALTER TABLE public.trips 
ADD CONSTRAINT trips_vehicle_id_fkey 
FOREIGN KEY (vehicle_id) 
REFERENCES public.vehicles(id) 
ON DELETE SET NULL;