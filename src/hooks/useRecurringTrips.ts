import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Location } from "@/types/trip";

export interface RecurringTrip {
  id: string;
  vehicleId: string | null;
  startLocation: Location;
  endLocation: Location;
  distance: number;
  baseDistance: number;
  roundTrip: boolean;
  purpose: string;
  daysOfWeek: number[]; // 0=Sun..6=Sat
  isActive: boolean;
  lastGeneratedDate: string | null;
}

function mapRow(r: any): RecurringTrip {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    startLocation: r.start_location,
    endLocation: r.end_location,
    distance: r.distance,
    baseDistance: r.base_distance,
    roundTrip: r.round_trip,
    purpose: r.purpose || "",
    daysOfWeek: (r.days_of_week || []) as number[],
    isActive: r.is_active,
    lastGeneratedDate: r.last_generated_date,
  };
}

export function useRecurringTrips() {
  const { user } = useAuth();
  const [items, setItems] = useState<RecurringTrip[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("recurring_trips" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setItems((data as any[]).map(mapRow));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (input: Omit<RecurringTrip, "id" | "lastGeneratedDate">) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("recurring_trips" as any)
      .insert({
        user_id: user.id,
        vehicle_id: input.vehicleId,
        start_location: input.startLocation as any,
        end_location: input.endLocation as any,
        distance: input.distance,
        base_distance: input.baseDistance,
        round_trip: input.roundTrip,
        purpose: input.purpose || null,
        days_of_week: input.daysOfWeek,
        is_active: input.isActive,
      } as any)
      .select()
      .single();
    if (error || !data) return null;
    const row = mapRow(data);
    setItems(p => [row, ...p]);
    return row;
  }, [user]);

  const update = useCallback(async (id: string, patch: Partial<Omit<RecurringTrip, "id">>) => {
    const payload: any = {};
    if (patch.vehicleId !== undefined) payload.vehicle_id = patch.vehicleId;
    if (patch.startLocation !== undefined) payload.start_location = patch.startLocation;
    if (patch.endLocation !== undefined) payload.end_location = patch.endLocation;
    if (patch.distance !== undefined) payload.distance = patch.distance;
    if (patch.baseDistance !== undefined) payload.base_distance = patch.baseDistance;
    if (patch.roundTrip !== undefined) payload.round_trip = patch.roundTrip;
    if (patch.purpose !== undefined) payload.purpose = patch.purpose;
    if (patch.daysOfWeek !== undefined) payload.days_of_week = patch.daysOfWeek;
    if (patch.isActive !== undefined) payload.is_active = patch.isActive;
    const { data, error } = await supabase
      .from("recurring_trips" as any)
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error || !data) return null;
    const row = mapRow(data);
    setItems(p => p.map(x => x.id === id ? row : x));
    return row;
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("recurring_trips" as any).delete().eq("id", id);
    if (!error) setItems(p => p.filter(x => x.id !== id));
  }, []);

  return { items, loading, create, update, remove, reload: load };
}

export const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
export const DAYS_FR_FULL = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
