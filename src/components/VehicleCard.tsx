import { memo } from 'react';
import { Vehicle, getIKBareme } from '@/types/trip';
import { Car, Edit2, X, MoreVertical, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
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

export const VehicleCard = memo(function VehicleCard({ vehicle, selected, onSelect, onEdit, onDelete, totalKm }: VehicleCardProps) {
  const bareme = getIKBareme(vehicle.fiscalPower);
  
  const getCurrentRate = () => {
    let rate = bareme.upTo5000.rate;
    if (totalKm && totalKm > 5000 && totalKm <= 20000) {
      rate = bareme.from5001To20000.rate;
    } else if (totalKm && totalKm > 20000) {
      rate = bareme.over20000.rate;
    }
    // Apply 20% bonus for electric vehicles
    if (vehicle.isElectric) {
      rate = rate * 1.2;
    }
    return rate;
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
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 min-w-0 w-2/3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 relative",
            selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            <Car className="w-4 h-4" />
          </div>
          <span className="font-semibold truncate font-display">{vehicle.make} {vehicle.model}</span>
          
          {/* Electric badge */}
          {vehicle.isElectric && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white shrink-0">
                  <Zap className="w-3 h-3" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Véhicule électrique (+20% IK)</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          <span className={cn(
            "px-2 py-0.5 rounded-full text-xs font-medium shrink-0",
            vehicle.isElectric 
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-primary/10 text-primary"
          )}>
            {vehicle.fiscalPower} CV
          </span>
        </div>
        
        <span className={cn(
          "text-xs shrink-0",
          vehicle.isElectric ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"
        )}>
          {getCurrentRate().toFixed(3)} €/km
        </span>
        
        {(onEdit || onDelete) && (
          <div className="ml-auto shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
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
                    <X className="w-4 h-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
});
