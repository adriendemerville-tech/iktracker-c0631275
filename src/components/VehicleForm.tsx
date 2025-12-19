import { useState, useEffect } from 'react';
import { Vehicle } from '@/types/trip';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Switch } from './ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Car, Loader2, AlertCircle, Check, Zap, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VehicleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (vehicle: Omit<Vehicle, 'id'>) => void;
  editVehicle?: Vehicle;
}

// Common French car makes for suggestion
const COMMON_MAKES = ['Renault', 'Peugeot', 'Citroën', 'Volkswagen', 'BMW', 'Mercedes', 'Audi', 'Toyota', 'Ford', 'Fiat', 'Opel', 'Nissan', 'Hyundai', 'Kia', 'Dacia', 'Skoda', 'Seat', 'Tesla'];

export function VehicleForm({ open, onOpenChange, onSave, editVehicle }: VehicleFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [fiscalPower, setFiscalPower] = useState('');
  const [year, setYear] = useState('');
  const [isElectric, setIsElectric] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);

  // Sync form state when editVehicle changes or sheet opens
  useEffect(() => {
    if (open) {
      setFirstName(editVehicle?.ownerFirstName || '');
      setLastName(editVehicle?.ownerLastName || '');
      setLicensePlate(editVehicle?.licensePlate || '');
      setMake(editVehicle?.make || '');
      setModel(editVehicle?.model || '');
      setFiscalPower(editVehicle?.fiscalPower?.toString() || '');
      setYear(editVehicle?.year?.toString() || '');
      setIsElectric(editVehicle?.isElectric || false);
      setLookupDone(!!editVehicle);
    }
  }, [open, editVehicle]);

  const formatLicensePlate = (value: string) => {
    // French format: AA-123-BB
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 7)}`;
  };

  const isPlateComplete = (plate: string) => {
    return /^[A-Z]{2}-\d{3}-[A-Z]{2}$/.test(plate);
  };

  const handleLicensePlateChange = async (value: string) => {
    const formatted = formatLicensePlate(value);
    setLicensePlate(formatted);
    setLookupDone(false);
    
    // Auto-trigger lookup when plate is complete
    if (isPlateComplete(formatted) && !isLookingUp) {
      await performLookup(formatted);
    }
  };

  const performLookup = async (plate: string) => {
    setIsLookingUp(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('vehicle-lookup', {
        body: { licensePlate: plate }
      });

      if (error) {
        console.error('Lookup error:', error);
        toast.error('Impossible de récupérer les informations du véhicule');
        setIsLookingUp(false);
        return;
      }

      if (data?.success) {
        // Pre-fill the form with API data
        if (data.make) setMake(data.make);
        if (data.model) setModel(data.model);
        if (data.year) setYear(data.year.toString());
        if (data.fiscalPower) setFiscalPower(data.fiscalPower.toString());
        if (data.isElectric !== undefined) setIsElectric(data.isElectric);
        
        setLookupDone(true);
        
        if (data.simulated) {
          toast.success('Véhicule détecté (données simulées)', {
            description: 'Veuillez vérifier et corriger les informations si nécessaire.'
          });
        } else {
          toast.success('Véhicule trouvé !', {
            description: 'Vérifiez la puissance fiscale sur votre carte grise (rubrique P.6).'
          });
        }
      } else {
        toast.error('Véhicule non trouvé', {
          description: 'Veuillez saisir les informations manuellement.'
        });
      }
    } catch (err) {
      console.error('Lookup error:', err);
      toast.error('Erreur lors de la recherche');
    }
    
    setIsLookingUp(false);
  };

  // Determine fuel type label and color
  const getFuelTypeInfo = () => {
    if (isElectric) return { label: 'Électrique', className: 'bg-emerald-500 text-white' };
    // For now, we assume non-electric is thermal. Hybrid detection could be added later.
    return { label: 'Thermique', className: 'bg-red-500 text-white' };
  };

  const handleSave = () => {
    if (!licensePlate || !fiscalPower) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const cv = parseInt(fiscalPower);
    if (isNaN(cv) || cv < 1 || cv > 50) {
      toast.error('Puissance fiscale invalide');
      return;
    }

    onSave({
      ownerFirstName: firstName.trim() || undefined,
      ownerLastName: lastName.trim() || undefined,
      licensePlate: licensePlate.toUpperCase(),
      make: make.trim() || 'Non renseigné',
      model: model.trim() || 'Non renseigné',
      fiscalPower: cv,
      year: year ? parseInt(year) : undefined,
      isElectric,
    });

    onOpenChange(false);
  };

  const fiscalPowerOptions = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const isPlateEmpty = !licensePlate || licensePlate.length === 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl overflow-hidden flex flex-col">
        <div className="w-[95%] max-w-lg mx-auto flex flex-col h-full">
          <SheetHeader className="pb-4 shrink-0">
            <SheetTitle className="text-xl flex items-center gap-2 font-display">
              <Car className="w-5 h-5 text-primary" />
              {editVehicle ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
            </SheetTitle>
          </SheetHeader>

          <div className="overflow-y-auto flex-1 pr-2">
            <div className="space-y-4 pb-6 font-display">
              {/* License plate + Fiscal Power - Side by side */}
              <div className="grid grid-cols-2 gap-3">
                {/* License plate */}
                <div className="space-y-1.5">
                  <Label htmlFor="licensePlate">Plaque *</Label>
                  <div className="relative">
                    <Input
                      id="licensePlate"
                      placeholder="AA-123-BB"
                      value={licensePlate}
                      onChange={(e) => handleLicensePlateChange(e.target.value)}
                      maxLength={9}
                      className={cn(
                        "font-mono text-base tracking-wider pr-10",
                        isPlateEmpty && "ring-2 ring-primary/50 border-primary"
                      )}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isLookingUp ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      ) : lookupDone ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Fiscal Power - Compact selector */}
                <div className="space-y-1.5">
                  <Label htmlFor="fiscalPower">Puissance fiscale *</Label>
                  <div className="grid grid-cols-5 gap-0.5">
                    {fiscalPowerOptions.map(cv => (
                      <button
                        key={cv}
                        type="button"
                        onClick={() => setFiscalPower(cv.toString())}
                        className={cn(
                          "px-1 py-1.5 rounded text-xs font-medium transition-all font-display",
                          fiscalPower === cv.toString()
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        )}
                      >
                        {cv}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 bg-muted rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  CV = rubrique P.6 de la carte grise. Détermine le barème IK.
                </p>
              </div>

              {/* Vehicle info - Read only display when lookup done */}
              {lookupDone && (make || model || year) && (
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Véhicule détecté</p>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {make && <span className="bg-background px-2 py-0.5 rounded">{make}</span>}
                    {model && <span className="bg-background px-2 py-0.5 rounded">{model}</span>}
                    {year && <span className="bg-background px-2 py-0.5 rounded">{year}</span>}
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getFuelTypeInfo().className)}>
                      {getFuelTypeInfo().label}
                    </span>
                  </div>
                </div>
              )}

              {/* Electric Vehicle Toggle */}
              <div className={cn(
                "flex items-center justify-between p-3 rounded-xl border-2 transition-all",
                isElectric 
                  ? "border-emerald-500/50 bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20" 
                  : "border-border bg-card"
              )}>
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    isElectric 
                      ? "bg-emerald-500 text-white" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="electric" className="text-sm font-semibold cursor-pointer">
                        100% électrique
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">
                            Majoration de 20% sur les IK. Les hybrides ne sont pas éligibles.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-xs text-muted-foreground">+20% IK</p>
                  </div>
                </div>
                <Switch
                  id="electric"
                  checked={isElectric}
                  onCheckedChange={setIsElectric}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" className="flex-1 font-display" onClick={() => onOpenChange(false)}>
                  Annuler
                </Button>
                <Button variant="gradient" className="flex-1 font-display" onClick={handleSave}>
                  {editVehicle ? 'Enregistrer' : 'Ajouter'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}