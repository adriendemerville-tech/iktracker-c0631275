import { Vehicle, getIKBareme } from '@/types/trip';
import { Car, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface VehicleCardProps {
  vehicle: Vehicle;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  totalKm?: number;
}

export function VehicleCard({ vehicle, selected, onSelect, onEdit, onDelete, totalKm }: VehicleCardProps) {
  const bareme = getIKBareme(vehicle.fiscalPower);
  
  const getCurrentRate = () => {
    if (!totalKm || totalKm <= 5000) return bareme.upTo5000.rate;
    if (totalKm <= 20000) return bareme.from5001To20000.rate;
    return bareme.over20000.rate;
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        "relative p-4 rounded-xl border-2 transition-all cursor-pointer",
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-primary/50"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            <Car className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold">{vehicle.make} {vehicle.model}</p>
            <p className="text-sm text-muted-foreground font-mono">{vehicle.licensePlate}</p>
          </div>
        </div>
        
        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-sm">
        <div>
          <span className="font-medium">{vehicle.ownerFirstName} {vehicle.ownerLastName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
            {vehicle.fiscalPower} CV
          </span>
          <span className="text-muted-foreground text-xs">
            {getCurrentRate().toFixed(3)} €/km
          </span>
        </div>
      </div>
    </div>
  );
}
