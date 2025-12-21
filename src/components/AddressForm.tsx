import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Home, Building2, MapPin, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Location {
  id: string;
  name: string;
  address?: string;
  type: string; // Can be 'home', 'office', or custom type
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
  const [type, setType] = useState<string>('home');
  const [customType, setCustomType] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [isValidating, setIsValidating] = useState(false);
  const [addressValidated, setAddressValidated] = useState(false);
  
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (editLocation) {
      setName(editLocation.name);
      setAddress(editLocation.address || '');
      // Check if type is a custom type (not home/office)
      if (editLocation.type === 'home' || editLocation.type === 'office') {
        setType(editLocation.type);
        setCustomType('');
      } else {
        setType('other');
        setCustomType(editLocation.type === 'other' ? '' : editLocation.type);
      }
      setLatitude(editLocation.latitude);
      setLongitude(editLocation.longitude);
      // If editing and has coordinates, consider it validated
      setAddressValidated(!!editLocation.latitude && !!editLocation.longitude);
    } else {
      setName('');
      setAddress('');
      setType('home');
      setCustomType('');
      setLatitude(undefined);
      setLongitude(undefined);
      setAddressValidated(false);
    }
  }, [editLocation, open]);

  // Reset validation when address changes manually
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
    setAddressValidated(false);
    setLatitude(undefined);
    setLongitude(undefined);
  };

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
          setAddressValidated(true);
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

  // Geocode address if not validated via autocomplete
  const geocodeAddress = async (addressText: string): Promise<{ address: string; lat: number; lng: number } | null> => {
    if (!window.google?.maps?.Geocoder) return null;
    
    const geocoder = new window.google.maps.Geocoder();
    
    return new Promise((resolve) => {
      geocoder.geocode(
        { address: addressText, componentRestrictions: { country: 'fr' } },
        (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const result = results[0];
            resolve({
              address: result.formatted_address,
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng(),
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;
    
    // If address wasn't validated via autocomplete, geocode it
    let finalAddress = address.trim();
    let finalLat = latitude;
    let finalLng = longitude;
    
    if (!addressValidated && window.google?.maps) {
      setIsValidating(true);
      const geocoded = await geocodeAddress(address.trim());
      setIsValidating(false);
      
      if (geocoded) {
        finalAddress = geocoded.address;
        finalLat = geocoded.lat;
        finalLng = geocoded.lng;
        
        toast({
          title: "Adresse corrigée",
          description: `L'adresse a été corrigée en : ${geocoded.address}`,
        });
      } else {
        toast({
          title: "Adresse non trouvée",
          description: "Impossible de valider cette adresse. Veuillez sélectionner une suggestion.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Use custom type if "other" is selected and customType is provided
    const finalType = type === 'other' && customType.trim() ? customType.trim() : type;
    
    onSave({
      name: name.trim(),
      address: finalAddress,
      type: finalType,
      latitude: finalLat,
      longitude: finalLng,
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
                {type === 'other' ? (
                  <Input
                    id="custom-type"
                    placeholder="Personnaliser..."
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    className="h-8 w-32 text-sm"
                    autoFocus
                  />
                ) : (
                  <Label htmlFor="type-other" className="flex items-center gap-1.5 cursor-pointer text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    Personnaliser
                  </Label>
                )}
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
                onChange={handleAddressChange}
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
            <Button type="submit" className="flex-1" disabled={!name.trim() || !address.trim() || isValidating}>
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validation...
                </>
              ) : (
                editLocation ? 'Enregistrer' : 'Ajouter'
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
