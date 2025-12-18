import { useState, useEffect, useRef } from 'react';
import { Location } from '@/types/trip';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { MapPin, Navigation, Plus, Home, Building2, Users, Truck, MapPinned, X, Clock } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { cn } from '@/lib/utils';
import { geocodeAddress, reverseGeocode } from '@/lib/geocoding';
import { toast } from '@/components/ui/sonner';

const RECENT_LOCATIONS_KEY = 'ik-recent-locations';
const MAX_RECENT = 2;

interface LocationPickerProps {
  savedLocations: Location[];
  onSelect: (location: Location) => void;
  onAddNew: (location: Omit<Location, 'id'>) => Promise<Location | null> | Location | null;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Location>) => void;
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

// Load recent locations from localStorage
const loadRecentLocations = (): Location[] => {
  try {
    const stored = localStorage.getItem(RECENT_LOCATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save recent locations to localStorage
const saveRecentLocation = (location: Location) => {
  const recents = loadRecentLocations();
  // Remove if already exists
  const filtered = recents.filter(l => l.address !== location.address);
  // Add to front and limit to MAX_RECENT
  const updated = [location, ...filtered].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(updated));
  return updated;
};

export function LocationPicker({ savedLocations, onSelect, onAddNew, onDelete, onUpdate }: LocationPickerProps) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentLocations, setRecentLocations] = useState<Location[]>(loadRecentLocations());
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newType, setNewType] = useState<Location['type']>('other');
  const [newCoords, setNewCoords] = useState<{ lat: number; lng: number } | null>(null);
  const { getCurrentPosition, loading: geoLoading } = useGeolocation();
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const editAddressInputRef = useRef<HTMLInputElement>(null);
  const searchAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const editAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use ref to always have latest onSelect callback (avoids stale closure issues)
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!searchInputRef.current) return;
    
    const initSearchAutocomplete = () => {
      if (!window.google?.maps?.places || !searchInputRef.current) return;

      try {
        if (searchAutocompleteRef.current) {
          window.google.maps.event.clearInstanceListeners(searchAutocompleteRef.current);
        }

        searchAutocompleteRef.current = new window.google.maps.places.Autocomplete(searchInputRef.current, {
          componentRestrictions: { country: 'fr' },
          fields: ['formatted_address', 'geometry', 'name'],
          types: ['geocode'],
        });

        searchAutocompleteRef.current.addListener('place_changed', async () => {
          const place = searchAutocompleteRef.current?.getPlace();
          if (place?.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            
            // Use reverse geocoding to get the city name
            let cityName = place.name || 'Lieu';
            const geocodeResult = await reverseGeocode(lat, lng);
            if (geocodeResult?.city) {
              cityName = geocodeResult.city;
            }
            
            // Create location WITHOUT saving to database
            const tempLocation: Location = {
              id: `temp-${crypto.randomUUID()}`,
              name: cityName,
              address: place.formatted_address || '',
              lat,
              lng,
              type: 'other',
            };
            // Save to recents
            const updatedRecents = saveRecentLocation(tempLocation);
            setRecentLocations(updatedRecents);
            // Select directly without saving - use ref to get latest callback
            onSelectRef.current(tempLocation);
            setSearchQuery('');
          }
        });
      } catch (error) {
        console.warn('Google Places Autocomplete not available:', error);
      }
    };

    const timer = setTimeout(() => {
      if (window.google?.maps?.places) {
        initSearchAutocomplete();
      }
    }, 300);
    
    return () => {
      clearTimeout(timer);
      if (searchAutocompleteRef.current && window.google?.maps?.event) {
        try {
          window.google.maps.event.clearInstanceListeners(searchAutocompleteRef.current);
        } catch (e) {}
      }
    };
  }, [onAddNew]); // onSelect handled via ref to avoid stale closures

  // Initialize Google Places Autocomplete for new location
  useEffect(() => {
    if (!showNewForm || !addressInputRef.current) return;
    
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
          setNewAddress(place.formatted_address || place.name || '');
          setNewCoords({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        }
      });
    };

    if (window.google?.maps?.places) {
      initAutocomplete();
    } else {
      const timer = setTimeout(initAutocomplete, 500);
      return () => clearTimeout(timer);
    }

    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [showNewForm]);

  // Initialize Google Places Autocomplete for edit location
  useEffect(() => {
    if (!editingLocation || !editAddressInputRef.current) return;
    
    const initEditAutocomplete = () => {
      if (!window.google?.maps?.places || !editAddressInputRef.current) return;

      if (editAutocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(editAutocompleteRef.current);
      }

      editAutocompleteRef.current = new window.google.maps.places.Autocomplete(editAddressInputRef.current, {
        componentRestrictions: { country: 'fr' },
        fields: ['formatted_address', 'geometry', 'name'],
        types: ['geocode'],
      });

      editAutocompleteRef.current.addListener('place_changed', () => {
        const place = editAutocompleteRef.current?.getPlace();
        if (place?.geometry?.location) {
          setEditingLocation(prev => prev ? {
            ...prev,
            address: place.formatted_address || place.name || '',
            lat: place.geometry!.location!.lat(),
            lng: place.geometry!.location!.lng(),
          } : null);
        }
      });
    };

    if (window.google?.maps?.places) {
      setTimeout(initEditAutocomplete, 100);
    }

    return () => {
      if (editAutocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(editAutocompleteRef.current);
      }
    };
  }, [editingLocation?.id]);

  const handleSearchSubmit = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    const coords = await geocodeAddress(query);
    if (!coords) {
      toast.error("Adresse introuvable");
      return;
    }

    const geocodeResult = await reverseGeocode(coords.lat, coords.lng);
    const tempLocation: Location = {
      id: `temp-${crypto.randomUUID()}`,
      name: geocodeResult?.city || query,
      address: geocodeResult?.fullAddress || query,
      lat: coords.lat,
      lng: coords.lng,
      type: 'other',
    };

    const updatedRecents = saveRecentLocation(tempLocation);
    setRecentLocations(updatedRecents);
    onSelect(tempLocation);
    setSearchQuery('');
  };

  const handleUseCurrentLocation = async () => {
    try {
      const coords = await getCurrentPosition();
      
      // Use reverse geocoding to get the city name
      let cityName = 'Position actuelle';
      const geocodeResult = await reverseGeocode(coords.lat, coords.lng);
      if (geocodeResult?.city) {
        cityName = geocodeResult.city;
      }
      
      // Create location WITHOUT saving to database
      const tempLocation: Location = {
        id: `temp-${crypto.randomUUID()}`,
        name: cityName,
        address: geocodeResult?.fullAddress || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
        lat: coords.lat,
        lng: coords.lng,
        type: 'other',
      };
      // Save to recents
      const updatedRecents = saveRecentLocation(tempLocation);
      setRecentLocations(updatedRecents);
      // Select directly
      onSelect(tempLocation);
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

  const handleLongPressStart = (location: Location) => {
    longPressTimerRef.current = setTimeout(() => {
      setEditingLocation(location);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleSaveEdit = () => {
    if (!editingLocation || !onUpdate) return;
    onUpdate(editingLocation.id, {
      name: editingLocation.name,
      address: editingLocation.address,
      lat: editingLocation.lat,
      lng: editingLocation.lng,
      type: editingLocation.type,
    });
    setEditingLocation(null);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(id);
    }
  };

  return (
    <div className="space-y-4 w-full overflow-x-hidden">
      {/* Search input */}
      <div className="relative w-full">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          placeholder="Rechercher une adresse..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearchSubmit();
            }
          }}
          className="pl-10 h-12 text-base w-full"
        />
      </div>

      <Button
        variant="outline"
        className="w-full justify-start gap-3"
        onClick={handleUseCurrentLocation}
        disabled={geoLoading}
      >
        <Navigation className={cn("w-5 h-5 text-primary shrink-0", geoLoading && "animate-pulse")} />
        {geoLoading ? 'Localisation...' : 'Utiliser ma position'}
      </Button>

      {/* Recent locations */}
      {recentLocations.length > 0 && (
        <div className="space-y-2 w-full">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" />
            Récents
          </p>
          <div className="flex flex-col gap-2 w-full">
            {recentLocations.map((location, index) => (
              <button
                key={`recent-${index}`}
                onClick={() => onSelect(location)}
                className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors text-left w-full min-w-0"
              >
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0 overflow-hidden">
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
      )}

      <div className="space-y-2 w-full">
        <p className="text-sm font-medium text-muted-foreground">Lieux enregistrés</p>
        <p className="text-xs text-muted-foreground">Appui long pour modifier</p>
        <div className="flex flex-col gap-2 w-full">
          {savedLocations.map((location) => (
            <div key={location.id} className="relative group w-full">
              {editingLocation?.id === location.id ? (
                <div className="space-y-3 p-4 bg-accent/10 rounded-md border-2 border-accent animate-fade-in w-full">
                  <Input
                    placeholder="Nom du lieu"
                    value={editingLocation.name}
                    onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                    autoFocus
                  />
                  <div className="relative">
                    <Input
                      ref={editAddressInputRef}
                      placeholder="Adresse"
                      value={editingLocation.address}
                      onChange={(e) => setEditingLocation({ ...editingLocation, address: e.target.value })}
                    />
                    {editingLocation.lat && editingLocation.lng && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-accent text-sm">✓ GPS</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(typeLabels) as Location['type'][]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setEditingLocation({ ...editingLocation, type })}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                          editingLocation.type === type
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
                    <Button variant="secondary" onClick={() => setEditingLocation(null)} className="flex-1">
                      Annuler
                    </Button>
                    <Button onClick={handleSaveEdit} className="flex-1" disabled={!editingLocation.name.trim()}>
                      Enregistrer
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => onSelect(location)}
                  onMouseDown={() => handleLongPressStart(location)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onTouchStart={() => handleLongPressStart(location)}
                  onTouchEnd={handleLongPressEnd}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left w-full min-w-0"
                >
                  <span className="text-primary shrink-0">{typeIcons[location.type]}</span>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="font-medium truncate">{location.name}</p>
                    {location.address && (
                      <p className="text-sm text-muted-foreground truncate">{location.address}</p>
                    )}
                  </div>
                  {location.lat && location.lng && (
                    <MapPin className="w-3 h-3 text-accent shrink-0" />
                  )}
                </button>
              )}
              {onDelete && editingLocation?.id !== location.id && (
                <button
                  onClick={(e) => handleDelete(e, location.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {!showNewForm && !editingLocation ? (
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-primary"
          onClick={() => setShowNewForm(true)}
        >
          <Plus className="w-5 h-5" />
          Ajouter un nouveau lieu
        </Button>
      ) : !editingLocation && (
        <div className="space-y-3 p-4 bg-muted rounded-md animate-fade-in">
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
