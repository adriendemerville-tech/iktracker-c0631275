import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Home, Building2, MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";
import { AddressSuggestion } from "@/hooks/useAddressAutocomplete";
import { geocodeAddressWithGeopf } from "@/lib/address-geocoding";
import { isUsableCoord } from "@/lib/distance";

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
  onSave: (location: Omit<Location, "id">) => void | boolean | Promise<void | boolean>;
  editLocation?: Location;
}

export function AddressForm({ open, onOpenChange, onSave, editLocation }: AddressFormProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState<string>("home");
  const [customType, setCustomType] = useState("");
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [isValidating, setIsValidating] = useState(false);
  const [addressValidated, setAddressValidated] = useState(false);

  const addressInputRef = useRef<HTMLInputElement>(null);
  const selectionSeq = useRef(0);
  const { toast } = useToast();

  useEffect(() => {
    if (editLocation) {
      setName(editLocation.name);
      setAddress(editLocation.address || "");
      // Check if type is a custom type (not home/office)
      if (editLocation.type === "home" || editLocation.type === "office") {
        setType(editLocation.type);
        setCustomType("");
      } else {
        setType("other");
        setCustomType(editLocation.type === "other" ? "" : editLocation.type);
      }
      setLatitude(editLocation.latitude);
      setLongitude(editLocation.longitude);
      setAddressValidated(isUsableCoord(editLocation.latitude, editLocation.longitude));
    } else {
      setName("");
      setAddress("");
      setType("home");
      setCustomType("");
      setLatitude(undefined);
      setLongitude(undefined);
      setAddressValidated(false);
    }
  }, [editLocation, open]);

  // Reset validation when address changes manually
  const handleAddressChange = (value: string) => {
    selectionSeq.current += 1;
    setAddress(value);
    setAddressValidated(false);
    setLatitude(undefined);
    setLongitude(undefined);
    setIsValidating(false);
  };

  const handleAddressSelect = async (suggestion: AddressSuggestion) => {
    const seq = ++selectionSeq.current;
    setAddress(suggestion.fulltext);

    if (isUsableCoord(suggestion.lat, suggestion.lng)) {
      setLatitude(suggestion.lat);
      setLongitude(suggestion.lng);
      setAddressValidated(true);
      return;
    }

    // Les suggestions Google arrivent avec 0,0 : on géocode avant de valider.
    setLatitude(undefined);
    setLongitude(undefined);
    setAddressValidated(false);
    setIsValidating(true);
    const geocoded = await geocodeAddressWithGeopf(suggestion.fulltext);
    if (seq !== selectionSeq.current) return;
    setIsValidating(false);

    if (!geocoded) {
      toast({
        title: "Adresse non trouvée",
        description:
          "Impossible de situer cette adresse. Modifiez-la ou choisissez une autre suggestion.",
        variant: "destructive",
      });
      return;
    }

    setAddress(geocoded.address);
    setLatitude(geocoded.lat);
    setLongitude(geocoded.lng);
    setAddressValidated(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;

    let finalAddress = address.trim();
    let finalLat = latitude;
    let finalLng = longitude;

    if (!isUsableCoord(finalLat, finalLng)) {
      setIsValidating(true);
      const geocoded = await geocodeAddressWithGeopf(finalAddress);
      setIsValidating(false);

      if (geocoded) {
        finalAddress = geocoded.address;
        finalLat = geocoded.lat;
        finalLng = geocoded.lng;
        setAddress(finalAddress);
        setLatitude(finalLat);
        setLongitude(finalLng);
        setAddressValidated(true);

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
    const finalType = type === "other" && customType.trim() ? customType.trim() : type;

    const saved = await onSave({
      name: name.trim(),
      address: finalAddress,
      type: finalType,
      latitude: finalLat,
      longitude: finalLng,
    });
    if (saved === false) return;
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editLocation ? "Modifier l'adresse" : "Nouvelle adresse"}</SheetTitle>
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
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as typeof type)}
              className="flex gap-4"
            >
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
                {type === "other" ? (
                  <Input
                    id="custom-type"
                    placeholder="Personnaliser..."
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    className="h-8 w-32 text-sm"
                    autoFocus
                  />
                ) : (
                  <Label
                    htmlFor="type-other"
                    className="flex items-center gap-1.5 cursor-pointer text-muted-foreground"
                  >
                    <MapPin className="w-4 h-4" />
                    Personnaliser
                  </Label>
                )}
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              Adresse complète
              {addressValidated && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-normal">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Validée
                </span>
              )}
            </Label>
            <div className="relative">
              <AddressAutocompleteInput
                ref={addressInputRef}
                placeholder="Rechercher une adresse..."
                value={address}
                onChange={handleAddressChange}
                onSelect={handleAddressSelect}
                className={`transition-colors ${addressValidated ? "border-emerald-500/50 focus-visible:ring-emerald-500/30" : ""}`}
              />
              {addressValidated && isUsableCoord(latitude, longitude) && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {addressValidated
                ? "Coordonnées GPS enregistrées pour le calcul des distances."
                : "Sélectionnez une suggestion pour valider l'adresse."}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!name.trim() || !address.trim() || isValidating}
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validation...
                </>
              ) : editLocation ? (
                "Enregistrer"
              ) : (
                "Ajouter"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
