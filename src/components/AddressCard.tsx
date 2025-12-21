import { memo } from 'react';
import { Home, Building2, MapPin, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface Location {
  id: string;
  name: string;
  address?: string;
  type: 'home' | 'office' | 'other';
}

interface AddressCardProps {
  location: Location;
  onEdit?: () => void;
  onDelete?: () => void;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'home':
      return <Home className="w-4 h-4 text-primary" />;
    case 'office':
      return <Building2 className="w-4 h-4 text-orange-500" />;
    default:
      return <MapPin className="w-4 h-4 text-muted-foreground" />;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'home':
      return 'Domicile';
    case 'office':
      return 'Bureau';
    default:
      return 'Autre';
  }
};

export const AddressCard = memo(function AddressCard({ location, onEdit, onDelete }: AddressCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border/50">
      <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center border border-border/50">
        {getTypeIcon(location.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{location.name}</p>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {getTypeLabel(location.type)}
          </span>
        </div>
        {location.address && (
          <p className="text-sm text-muted-foreground truncate">{location.address}</p>
        )}
        {!location.address && (
          <p className="text-sm text-amber-600 dark:text-amber-400">Adresse non définie</p>
        )}
      </div>
      {(onEdit || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                Modifier
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
});
