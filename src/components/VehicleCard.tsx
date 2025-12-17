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
        "relative px-3 py-3 rounded-lg border-2 transition-all cursor-pointer",
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-primary/50"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            <Car className="w-4 h-4" />
          </div>
          <span className="font-semibold truncate">{vehicle.make} {vehicle.model}</span>
          {vehicle.licensePlate && (
            <span className="text-xs text-muted-foreground font-mono hidden sm:inline">{vehicle.licensePlate}</span>
          )}
          {(vehicle.ownerFirstName || vehicle.ownerLastName) && (
            <span className="text-xs text-muted-foreground hidden sm:inline">• {vehicle.ownerFirstName} {vehicle.ownerLastName}</span>
          )}
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium shrink-0">
            {vehicle.fiscalPower} CV
          </span>
        </div>
        
        <span className="text-muted-foreground text-xs shrink-0 ml-auto">
          {getCurrentRate().toFixed(3)} €/km
        </span>
        
        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
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
    </div>
  );
}
