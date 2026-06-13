import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2, Repeat, Pencil, Check, X } from "lucide-react";
import { useRecurringTrips, DAYS_FR, RecurringTrip } from "@/hooks/useRecurringTrips";
import { Vehicle } from "@/types/trip";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicles: Vehicle[];
}

export function RecurringTripsModal({ open, onOpenChange, vehicles }: Props) {
  const { items, update, remove, loading } = useRecurringTrips();
  const [editing, setEditing] = useState<string | null>(null);
  const [editDays, setEditDays] = useState<number[]>([]);

  const startEdit = (r: RecurringTrip) => {
    setEditing(r.id);
    setEditDays([...r.daysOfWeek]);
  };

  const saveEdit = async (r: RecurringTrip) => {
    await update(r.id, { daysOfWeek: editDays });
    setEditing(null);
    toast.success("Trajet récurrent mis à jour");
  };

  const toggleDay = (d: number) => {
    setEditDays(editDays.includes(d) ? editDays.filter(x => x !== d) : [...editDays, d].sort());
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce trajet récurrent ? Les trajets déjà générés ne sont pas affectés.")) return;
    await remove(id);
    toast.success("Trajet récurrent supprimé");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-primary" />
            Trajets récurrents
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucun trajet récurrent. Activez l'option "Récurrent" lors de la création d'un trajet.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map(r => {
              const vehicle = vehicles.find(v => v.id === r.vehicleId);
              const isEdit = editing === r.id;
              const days = isEdit ? editDays : r.daysOfWeek;
              return (
                <div key={r.id} className="border rounded-md p-3 space-y-2 bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {r.startLocation?.name || r.startLocation?.address} → {r.endLocation?.name || r.endLocation?.address}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.distance.toFixed(1)} km · {r.purpose || "Sans motif"}
                        {vehicle && ` · ${vehicle.make} ${vehicle.model}`}
                      </p>
                    </div>
                    <Switch
                      checked={r.isActive}
                      onCheckedChange={(v) => update(r.id, { isActive: v })}
                    />
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {[1, 2, 3, 4, 5, 6, 0].map(d => {
                      const active = days.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          disabled={!isEdit}
                          onClick={() => toggleDay(d)}
                          className={cn(
                            "py-1.5 rounded text-[11px] font-medium transition-colors",
                            active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                            isEdit && "hover:opacity-80 cursor-pointer"
                          )}
                        >
                          {DAYS_FR[d]}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    {isEdit ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="default" onClick={() => saveEdit(r)}>
                          <Check className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)} className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
