import { useRef, useEffect, useState, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
import { useAddressAutocomplete, AddressSuggestion } from '@/hooks/useAddressAutocomplete';
import { cn } from '@/lib/utils';

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const AddressAutocompleteInput = forwardRef<HTMLInputElement, AddressAutocompleteInputProps>(
  ({ value, onChange, onSelect, placeholder = 'Adresse...', className, disabled }, ref) => {
    const { suggestions, isLoading, search, clear } = useAddressAutocomplete();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);

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
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (suggestion: AddressSuggestion) => {
      onChange(suggestion.fulltext);
      onSelect(suggestion);
      setIsOpen(false);
      clear();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        handleSelect(suggestions[selectedIndex]);
      } else if (e.key === 'Escape') {
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
            className={cn('pr-8', className)}
            disabled={disabled}
          />
          {isLoading && (
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
                  'flex items-start gap-2 w-full px-3 py-2.5 text-left text-sm transition-colors',
                  'hover:bg-accent/50',
                  i === selectedIndex && 'bg-accent/50'
                )}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input blur
                  handleSelect(s);
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{s.fulltext}</p>
                  <p className="text-xs text-muted-foreground">{s.city} ({s.zipcode})</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

AddressAutocompleteInput.displayName = 'AddressAutocompleteInput';
