import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Home, Building2, MapPin } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  address?: string;
  type: 'home' | 'office' | 'other';
  latitude?: number;
  longitude?: number;
}

interface AddressFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (location: Omit<Location, 'id'>) => void;
  editLocation?: Location;
}

export function AddressForm({ open, onOpenChange, onSave, editLocation }: AddressFormProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<'home' | 'office' | 'other'>('home');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (editLocation) {
      setName(editLocation.name);
      setAddress(editLocation.address || '');
      setType(editLocation.type);
      setLatitude(editLocation.latitude);
      setLongitude(editLocation.longitude);
    } else {
      setName('');
      setAddress('');
      setType('home');
      setLatitude(undefined);
      setLongitude(undefined);
    }
  }, [editLocation, open]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!open || !addressInputRef.current) return;
    
    const initAutocomplete = () => {
      if (!window.google?.maps?.places || !addressInputRef.current) return;

      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }

      autocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        componentRestrictions: { country: 'fr' },
        fields: ['formatted_address', 'geometry', 'name'],
        types: ['geocode'],
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place?.geometry?.location) {
          setAddress(place.formatted_address || place.name || '');
          setLatitude(place.geometry.location.lat());
          setLongitude(place.geometry.location.lng());
        }
      });
    };

    // Small delay to ensure the input is rendered
    const timer = setTimeout(() => {
      if (window.google?.maps?.places) {
        initAutocomplete();
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;
    
    onSave({
      name: name.trim(),
      address: address.trim(),
      type,
      latitude,
      longitude,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editLocation ? 'Modifier l\'adresse' : 'Nouvelle adresse'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du lieu</Label>
            <Input
              id="name"
              placeholder="Ex: Maison, Bureau principal..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Type de lieu</Label>
            <RadioGroup value={type} onValueChange={(v) => setType(v as typeof type)} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="home" id="type-home" />
                <Label htmlFor="type-home" className="flex items-center gap-1.5 cursor-pointer">
                  <Home className="w-4 h-4 text-primary" />
                  Domicile
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="office" id="type-office" />
                <Label htmlFor="type-office" className="flex items-center gap-1.5 cursor-pointer">
                  <Building2 className="w-4 h-4 text-orange-500" />
                  Bureau
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="type-other" />
                <Label htmlFor="type-other" className="flex items-center gap-1.5 cursor-pointer">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  Autre
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse complète</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="address"
                ref={addressInputRef}
                placeholder="Rechercher une adresse..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="pl-10"
                required
              />
              {latitude && longitude && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-accent text-xs">✓ GPS</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Cette adresse sera utilisée pour calculer les distances des trajets importés du calendrier.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1" disabled={!name.trim() || !address.trim()}>
              {editLocation ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
