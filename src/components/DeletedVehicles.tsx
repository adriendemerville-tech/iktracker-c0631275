import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, ChevronDown, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePreferences } from "@/hooks/usePreferences";
import { mapVehicleRow, referenceKeys } from "@/hooks/useReferenceData";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { readLocalDeletedVehicles, restoreLocalVehicle, VEHICLE_ARCHIVE_EVENT, type DeletedVehicle } from "@/lib/deleted-vehicles";

export function DeletedVehicles() {
  const { user } = useAuth();
  const { preferences, updatePreference } = usePreferences();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const key = ["deleted-vehicles", user?.id];
  const query = useQuery({
    queryKey: key,
    enabled: expanded,
    queryFn: async (): Promise<DeletedVehicle[]> => {
      if (!user) return readLocalDeletedVehicles();
      const { data, error } = await supabase.from("deleted_vehicles").select("vehicle_data, deleted_at").eq("user_id", user.id).order("deleted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({ vehicle: mapVehicleRow(row.vehicle_data as Tables<"vehicles">), deletedAt: row.deleted_at }));
    },
  });
  useEffect(() => {
    const refresh = () => { queryClient.invalidateQueries({ queryKey: ["deleted-vehicles"] }); };
    window.addEventListener(VEHICLE_ARCHIVE_EVENT, refresh);
    return () => window.removeEventListener(VEHICLE_ARCHIVE_EVENT, refresh);
  }, [queryClient]);

  const restore = async (id: string) => {
    setRestoring(id);
    try {
      if (user) {
        const { error } = await supabase.rpc("restore_deleted_vehicle", { p_vehicle_id: id });
        if (error) throw error;
        const { data, error: readError } = await supabase.from("vehicles").select("id").eq("user_id", user.id);
        if (!readError && data?.length === 1) await updatePreference("defaultVehicleId", id);
        else if (preferences.defaultVehicleId === id) await updatePreference("defaultVehicleId", null);
        await queryClient.invalidateQueries({ queryKey: referenceKeys.vehicles(user.id) });
      } else {
        restoreLocalVehicle(id);
        const active = JSON.parse(localStorage.getItem("ik-tracker-vehicles") || "[]");
        if (active.length === 1) await updatePreference("defaultVehicleId", id);
      }
      window.dispatchEvent(new Event(VEHICLE_ARCHIVE_EVENT));
      await queryClient.invalidateQueries({ queryKey: key });
      toast.success("Véhicule restauré");
    } catch {
      toast.error("Impossible de restaurer ce véhicule. Réessayez.");
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="mt-4 border-t border-border pt-3">
      <Button variant="ghost" className="w-full justify-start gap-2" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        <ArchiveRestore className="size-4" /> Véhicules supprimés <ChevronDown className="ml-auto size-4" />
      </Button>
      {expanded && (
        <div className="mt-3 space-y-2">
          {query.isPending ? <><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></> : query.isError ? (
            <div className="space-y-2"><p className="text-sm text-muted-foreground">Impossible de charger les véhicules supprimés.</p><Button variant="outline" onClick={() => query.refetch()}>Réessayer</Button></div>
          ) : query.data?.length === 0 ? <p className="text-sm text-muted-foreground">Aucun véhicule supprimé récupérable.</p> : query.data?.map(({ vehicle, deletedAt }) => (
            <div key={vehicle.id} className="flex items-center gap-3 rounded-md border border-border p-3">
              <Car className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{vehicle.name || `${vehicle.make} ${vehicle.model}`.trim() || vehicle.licensePlate || "Véhicule"}</p><p className="text-xs text-muted-foreground">{vehicle.licensePlate} · Supprimé le {new Date(deletedAt).toLocaleDateString("fr-FR")}</p></div>
              <Button size="sm" variant="outline" disabled={restoring !== null} onClick={() => restore(vehicle.id)}><ArchiveRestore className="mr-1 size-4" />{restoring === vehicle.id ? "Restauration…" : "Restaurer"}</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}