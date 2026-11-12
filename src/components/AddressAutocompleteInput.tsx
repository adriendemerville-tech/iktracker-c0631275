import { useRef, useEffect, useState, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { useAddressAutocomplete, AddressSuggestion } from "@/hooks/useAddressAutocomplete";
import { geocodeAddressWithGeopf } from "@/lib/address-geocoding";
import { isUsableCoord } from "@/lib/distance";
import { cn } from "@/lib/utils";

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const AddressAutocompleteInput = forwardRef<HTMLInputElement, AddressAutocompleteInputProps>(
  ({ value, onChange, onSelect, placeholder = "Adresse...", className, disabled }, ref) => {
    const { suggestions, isLoading, search, clear } = useAddressAutocomplete();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isResolving, setIsResolving] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const resolveSeq = useRef(0);

    // Search when value changes
    useEffect(() => {
      if (value.length >= 3) {
        search(value);
        setIsOpen(true);
        setSelectedIndex(-1);
      } else {
        clear();
        setIsOpen(false);
      }
    }, [value, search, clear]);

    // Close on outside click
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = async (suggestion: AddressSuggestion) => {
      const seq = ++resolveSeq.current;
      let chosen = suggestion;
      // Les prédictions Google n'ont pas de GPS (0,0) : on le résout ici,
      // avant de transmettre la suggestion au formulaire.
      if (!isUsableCoord(suggestion.lat, suggestion.lng)) {
        setIsResolving(true);
        try {
          const geocoded = await geocodeAddressWithGeopf(suggestion.fulltext);
          if (seq !== resolveSeq.current) return;
          if (geocoded) {
            chosen = {
              ...suggestion,
              fulltext: geocoded.address,
              lat: geocoded.lat,
              lng: geocoded.lng,
            };
          }
        } finally {
          if (seq === resolveSeq.current) setIsResolving(false);
        }
      }
      if (seq !== resolveSeq.current) return;
      onChange(chosen.fulltext);
      onSelect(chosen);
      setIsOpen(false);
      clear();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && !e.nativeEvent.isComposing) {
        // Sans surbrillance (clavier mobile : pas de flèches), Entrée choisit
        // la première suggestion au lieu d'envoyer le formulaire.
        e.preventDefault();
        handleSelect(suggestions[selectedIndex >= 0 ? selectedIndex : 0]);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    return (
      <div ref={containerRef} className="relative w-full">
        <div className="relative">
          <Input
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            placeholder={placeholder}
            className={cn("pr-8", className)}
            disabled={disabled}
          />
          {(isLoading || isResolving) && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {isOpen && suggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={`${s.fulltext}-${i}`}
                type="button"
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm leading-tight transition-colors",
                  "hover:bg-accent/50",
                  i === selectedIndex && "bg-accent/50",
                )}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input blur
                  handleSelect(s);
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate leading-tight">{s.fulltext}</p>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {s.city} ({s.zipcode})
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
);

AddressAutocompleteInput.displayName = "AddressAutocompleteInput";
