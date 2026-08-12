import { supabase } from './supabase';
import { calculateTripIK } from './ik';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  license_plate: string;
  fiscal_power: number;
  is_electric: boolean | null;
}

export interface TripRow {
  id: string;
  date: string;
  distance: number;
  ik_amount: number;
  purpose: string | null;
  start_address: string | null;
  end_address: string | null;
  vehicle_id: string | null;
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, make, model, license_plate, fiscal_power, is_electric')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Vehicle[];
}

export async function fetchTrips(limit = 100): Promise<TripRow[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('id, date, distance, ik_amount, purpose, start_address, end_address, vehicle_id')
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as TripRow[];
}

export async function getAnnualKm(vehicleId: string, year = new Date().getFullYear()): Promise<number> {
  const { data, error } = await supabase
    .from('trips')
    .select('distance')
    .eq('vehicle_id', vehicleId)
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`);
  if (error) throw error;
  return (data ?? []).reduce((sum, t: { distance: number }) => sum + (t.distance ?? 0), 0);
}

export async function createTrip(input: {
  vehicle: Vehicle;
  date: string; // YYYY-MM-DD
  distance: number;
  purpose: string;
  startAddress: string;
  endAddress: string;
  tourStops?: unknown[];
}): Promise<TripRow> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Session expirée');

  const totalAnnualKmBefore = await getAnnualKm(input.vehicle.id);
  const ikAmount = calculateTripIK({
    distance: input.distance,
    totalAnnualKmBefore,
    fiscalPower: input.vehicle.fiscal_power,
    isElectric: !!input.vehicle.is_electric,
  });

  const { data, error } = await supabase
    .from('trips')
    .insert({
      user_id: userId,
      vehicle_id: input.vehicle.id,
      date: input.date,
      distance: input.distance,
      ik_amount: ikAmount,
      purpose: input.purpose,
      start_address: input.startAddress,
      end_address: input.endAddress,
      tour_stops: input.tourStops ?? null,
      status: 'validated',
    })
    .select('id, date, distance, ik_amount, purpose, start_address, end_address, vehicle_id')
    .single();

  if (error) throw error;
  return data as TripRow;
}
