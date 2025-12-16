import { useState, useEffect, useRef } from 'react';
import { Location } from '@/types/trip';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { MapPin, Navigation, Plus, Home, Building2, Users, Truck, MapPinned, Loader2 } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { cn } from '@/lib/utils';

interface LocationPickerProps {
  savedLocations: Location[];
  onSelect: (location: Location) => void;
  onAddNew: (location: Omit<Location, 'id'>) => Promise<Location | null> | Location | null;
}

const typeIcons: Record<string, React.ReactNode> = {
  home: <Home className="w-4 h-4" />,
  office: <Building2 className="w-4 h-4" />,
  client: <Users className="w-4 h-4" />,
  supplier: <Truck className="w-4 h-4" />,
  other: <MapPinned className="w-4 h-4" />,
};

const typeLabels: Record<string, string> = {
  home: 'Maison',
  office: 'Bureau',
  client: 'Client',
  supplier: 'Fournisseur',
  other: 'Autre',
};

export function LocationPicker({ savedLocations, onSelect, onAddNew }: LocationPickerProps) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newType, setNewType] = useState<Location['type']>('other');
  const [newCoords, setNewCoords] = useState<{ lat: number; lng: number } | null>(null);
  const { getCurrentPosition, loading: geoLoading } = useGeolocation();
  
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!showNewForm || !addressInputRef.current) return;
    
    // Wait for Google Maps to be available
    const initAutocomplete = () => {
      if (!window.google?.maps?.places || !addressInputRef.current) return;

      // Clean up existing autocomplete
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }

      autocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        componentRestrictions: { country: 'fr' },
        fields: ['formatted_address', 'geometry', 'name'],
        types: ['address'],
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place?.geometry?.location) {
          setNewAddress(place.formatted_address || place.name || '');
          setNewCoords({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        }
      });
    };

    // Check if Google Maps is already loaded
    if (window.google?.maps?.places) {
      initAutocomplete();
    } else {
      // Wait a bit for the script to load
      const timer = setTimeout(initAutocomplete, 500);
      return () => clearTimeout(timer);
    }

    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [showNewForm]);

  const handleUseCurrentLocation = async () => {
    try {
      const coords = await getCurrentPosition();
      const result = onAddNew({
        name: 'Position actuelle',
        address: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
        lat: coords.lat,
        lng: coords.lng,
        type: 'other',
      });
      const location = result instanceof Promise ? await result : result;
      if (location) {
        onSelect(location);
      }
    } catch (error) {
      console.error('Geolocation error:', error);
    }
  };

  const handleCaptureCoords = async () => {
    try {
      const coords = await getCurrentPosition();
      setNewCoords(coords);
    } catch (error) {
      console.error('Geolocation error:', error);
    }
  };

  const handleAddNew = async () => {
    if (!newName.trim()) return;
    const result = onAddNew({
      name: newName,
      address: newAddress,
      lat: newCoords?.lat,
      lng: newCoords?.lng,
      type: newType,
    });
    const location = result instanceof Promise ? await result : result;
    if (location) {
      onSelect(location);
    }
    setShowNewForm(false);
    setNewName('');
    setNewAddress('');
    setNewType('other');
    setNewCoords(null);
  };

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        className="w-full justify-start gap-3"
        onClick={handleUseCurrentLocation}
        disabled={geoLoading}
      >
        <Navigation className={cn("w-5 h-5 text-primary", geoLoading && "animate-pulse")} />
        {geoLoading ? 'Localisation...' : 'Utiliser ma position actuelle'}
      </Button>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Lieux enregistrés</p>
        <div className="grid gap-2">
          {savedLocations.map((location) => (
            <button
              key={location.id}
              onClick={() => onSelect(location)}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left"
            >
              <span className="text-primary">{typeIcons[location.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{location.name}</p>
                {location.address && (
                  <p className="text-sm text-muted-foreground truncate">{location.address}</p>
                )}
              </div>
              {location.lat && location.lng && (
                <MapPin className="w-3 h-3 text-accent shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {!showNewForm ? (
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-primary"
          onClick={() => setShowNewForm(true)}
        >
          <Plus className="w-5 h-5" />
          Ajouter un nouveau lieu
        </Button>
      ) : (
        <div className="space-y-3 p-4 bg-muted rounded-xl animate-fade-in">
          <Input
            placeholder="Nom du lieu"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className="relative">
            <Input
              ref={addressInputRef}
              placeholder="Rechercher une adresse..."
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="pr-10"
            />
            {newCoords && newAddress && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-accent text-sm">✓ GPS</span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={handleCaptureCoords}
            disabled={geoLoading}
          >
            <Navigation className={cn("w-4 h-4", geoLoading && "animate-pulse", newCoords && "text-accent")} />
            {geoLoading ? 'Localisation...' : newCoords ? `✓ Position GPS capturée` : 'Capturer ma position GPS ici'}
          </Button>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(typeLabels) as Location['type'][]).map((type) => (
              <button
                key={type}
                onClick={() => setNewType(type)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                  newType === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {typeIcons[type]}
                {typeLabels[type]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setShowNewForm(false); setNewCoords(null); }} className="flex-1">
              Annuler
            </Button>
            <Button onClick={handleAddNew} className="flex-1" disabled={!newName.trim()}>
              Ajouter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
