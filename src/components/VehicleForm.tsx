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
  const [fieldsUnlocked, setFieldsUnlocked] = useState(false);

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
      setFieldsUnlocked(!!editVehicle);
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
        setFieldsUnlocked(true);
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
        setFieldsUnlocked(true);
        
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
        setFieldsUnlocked(true);
      }
    } catch (err) {
      console.error('Lookup error:', err);
      toast.error('Erreur lors de la recherche');
      setFieldsUnlocked(true);
    }
    
    setIsLookingUp(false);
  };

  const handleSave = () => {
    if (!firstName.trim() || !lastName.trim() || !licensePlate || !fiscalPower) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const cv = parseInt(fiscalPower);
    if (isNaN(cv) || cv < 1 || cv > 50) {
      toast.error('Puissance fiscale invalide');
      return;
    }

    onSave({
      ownerFirstName: firstName.trim(),
      ownerLastName: lastName.trim(),
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl flex items-center gap-2 font-display">
            <Car className="w-5 h-5 text-primary" />
            {editVehicle ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-8 font-display">
          {/* Owner info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Propriétaire</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  placeholder="Jean"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="font-display"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  placeholder="Dupont"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="font-display"
                />
              </div>
            </div>
          </div>

          {/* License plate with auto-lookup */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Immatriculation</h3>
            <div className="space-y-2">
              <Label htmlFor="licensePlate">Plaque d'immatriculation *</Label>
              <div className="relative">
                <Input
                  id="licensePlate"
                  placeholder="AA-123-BB"
                  value={licensePlate}
                  onChange={(e) => handleLicensePlateChange(e.target.value)}
                  maxLength={9}
                  className="font-mono text-lg tracking-wider pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isLookingUp ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : lookupDone ? (
                    <Check className="w-5 h-5 text-emerald-500" />
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Les informations du véhicule seront récupérées automatiquement
              </p>
            </div>
          </div>

          {/* Vehicle info - locked until lookup done */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Informations véhicule
              {!fieldsUnlocked && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  Remplissez l'immatriculation
                </span>
              )}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="make">Marque</Label>
                <Input
                  id="make"
                  placeholder="Renault"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  list="makes"
                  disabled={!fieldsUnlocked}
                  className={cn("font-display", !fieldsUnlocked && "opacity-50")}
                />
                <datalist id="makes">
                  {COMMON_MAKES.map(m => <option key={m} value={m} />)}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Modèle</Label>
                <Input
                  id="model"
                  placeholder="Clio"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={!fieldsUnlocked}
                  className={cn("font-display", !fieldsUnlocked && "opacity-50")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Année</Label>
              <Input
                id="year"
                type="number"
                placeholder="2020"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min="1990"
                max={new Date().getFullYear() + 1}
                disabled={!fieldsUnlocked}
                className={cn("font-display", !fieldsUnlocked && "opacity-50")}
              />
            </div>
          </div>

          {/* Electric Vehicle Toggle */}
          <div className="space-y-4">
            <div className={cn(
              "flex items-center justify-between p-4 rounded-xl border-2 transition-all",
              isElectric 
                ? "border-emerald-500/50 bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20" 
                : "border-border bg-card",
              !fieldsUnlocked && "opacity-50 pointer-events-none"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                  isElectric 
                    ? "bg-emerald-500 text-white" 
                    : "bg-muted text-muted-foreground"
                )}>
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="electric" className="text-sm font-semibold cursor-pointer">
                      Véhicule 100% électrique
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">
                          Conformément au barème fiscal, les véhicules 100% électriques bénéficient d'une majoration de 20% sur les indemnités kilométriques. Les hybrides ne sont pas éligibles.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Majoration de 20% sur vos IK
                  </p>
                </div>
              </div>
              <Switch
                id="electric"
                checked={isElectric}
                onCheckedChange={setIsElectric}
                disabled={!fieldsUnlocked}
              />
            </div>
          </div>

          {/* Fiscal power - CRITICAL for IK calculation */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Puissance fiscale
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Important</span>
            </h3>
            <div className="space-y-2">
              <Label htmlFor="fiscalPower">Puissance fiscale (CV) *</Label>
              <div className={cn(
                "flex flex-wrap gap-2",
                !fieldsUnlocked && "opacity-50 pointer-events-none"
              )}>
                {fiscalPowerOptions.map(cv => (
                  <button
                    key={cv}
                    type="button"
                    onClick={() => setFiscalPower(cv.toString())}
                    disabled={!fieldsUnlocked}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all font-display",
                      fiscalPower === cv.toString()
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    {cv} CV
                  </button>
                ))}
              </div>
              <div className="flex items-start gap-2 p-3 bg-muted rounded-lg mt-3">
                <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  La puissance fiscale (CV) figure sur la carte grise à la rubrique P.6. 
                  Elle détermine le barème des indemnités kilométriques applicable.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1 font-display" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button variant="gradient" className="flex-1 font-display" onClick={handleSave}>
              {editVehicle ? 'Enregistrer' : 'Ajouter le véhicule'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
