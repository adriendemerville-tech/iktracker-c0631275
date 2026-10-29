import { Car, Plus } from "lucide-react";
import { Button } from "./ui/button";

interface EmptyVehiclesCardProps {
  onAdd: () => void;
}

export function EmptyVehiclesCard({ onAdd }: EmptyVehiclesCardProps) {
  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label="Ajouter un véhicule"
      aria-haspopup="dialog"
      className="block w-full cursor-pointer appearance-none rounded-md border-0 bg-card px-0 py-8 text-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="relative mb-4 inline-flex">
        <Car className="w-12 h-12 text-muted-foreground/50" aria-hidden="true" />
        <span
          data-testid="empty-vehicle-add-badge"
          aria-hidden="true"
          className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card"
        >
          <Plus className="w-3 h-3" strokeWidth={3} />
        </span>
      </span>
      <span className="block text-muted-foreground">Aucun véhicule enregistré</span>
      <span className="mt-1 mb-4 block text-sm text-muted-foreground">
        Ajoutez votre véhicule pour commencer
      </span>
      <Button asChild className="hidden md:inline-flex">
        <span>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un véhicule
        </span>
      </Button>
    </button>
  );
}
