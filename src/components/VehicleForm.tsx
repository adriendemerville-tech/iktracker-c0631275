import { useState } from 'react';
import { Vehicle } from '@/types/trip';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Car, Search, Loader2, AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VehicleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (vehicle: Omit<Vehicle, 'id'>) => void;
  editVehicle?: Vehicle;
}

// Common French car makes for suggestion
const COMMON_MAKES = ['Renault', 'Peugeot', 'Citroën', 'Volkswagen', 'BMW', 'Mercedes', 'Audi', 'Toyota', 'Ford', 'Fiat', 'Opel', 'Nissan', 'Hyundai', 'Kia', 'Dacia', 'Skoda', 'Seat'];

export function VehicleForm({ open, onOpenChange, onSave, editVehicle }: VehicleFormProps) {
  const [firstName, setFirstName] = useState(editVehicle?.ownerFirstName || '');
  const [lastName, setLastName] = useState(editVehicle?.ownerLastName || '');
  const [licensePlate, setLicensePlate] = useState(editVehicle?.licensePlate || '');
  const [make, setMake] = useState(editVehicle?.make || '');
  const [model, setModel] = useState(editVehicle?.model || '');
  const [fiscalPower, setFiscalPower] = useState(editVehicle?.fiscalPower?.toString() || '');
  const [year, setYear] = useState(editVehicle?.year?.toString() || '');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);

  const formatLicensePlate = (value: string) => {
    // French format: AA-123-BB
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 7)}`;
  };

  const handleLicensePlateChange = (value: string) => {
    const formatted = formatLicensePlate(value);
    setLicensePlate(formatted);
    setLookupDone(false);
  };

  const handleLookup = async () => {
    if (licensePlate.length < 9) {
      toast.error('Veuillez entrer une immatriculation complète');
      return;
    }

    setIsLookingUp(true);
    
    // Simulate API lookup - in production, this would call a real API
    // like the French SIV database or a third-party service
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // For demo purposes, generate plausible data based on plate format
    // New French plates (post-2009): AA-123-BB
    const isNewFormat = /^[A-Z]{2}-\d{3}-[A-Z]{2}$/.test(licensePlate);
    
    if (isNewFormat) {
      // Simulate finding the vehicle
      const randomMake = COMMON_MAKES[Math.floor(Math.random() * COMMON_MAKES.length)];
      setMake(randomMake);
      setModel('Modèle détecté');
      setYear('2020');
      setLookupDone(true);
      toast.success('Véhicule trouvé ! Veuillez confirmer la puissance fiscale.');
    } else {
      toast.error('Format d\'immatriculation non reconnu. Veuillez saisir manuellement.');
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
    });

    // Reset form
    setFirstName('');
    setLastName('');
    setLicensePlate('');
    setMake('');
    setModel('');
    setFiscalPower('');
    setYear('');
    setLookupDone(false);
    onOpenChange(false);
  };

  const fiscalPowerOptions = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            {editVehicle ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-8">
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  placeholder="Dupont"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* License plate with lookup */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Immatriculation</h3>
            <div className="space-y-2">
              <Label htmlFor="licensePlate">Plaque d'immatriculation *</Label>
              <div className="flex gap-2">
                <Input
                  id="licensePlate"
                  placeholder="AA-123-BB"
                  value={licensePlate}
                  onChange={(e) => handleLicensePlateChange(e.target.value)}
                  maxLength={9}
                  className="font-mono text-lg tracking-wider"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleLookup}
                  disabled={isLookingUp || licensePlate.length < 9}
                >
                  {isLookingUp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : lookupDone ? (
                    <Check className="w-4 h-4 text-accent" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Cliquez sur la loupe pour rechercher les informations du véhicule
              </p>
            </div>
          </div>

          {/* Vehicle info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Informations véhicule</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="make">Marque</Label>
                <Input
                  id="make"
                  placeholder="Renault"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  list="makes"
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
              <div className="flex flex-wrap gap-2">
                {fiscalPowerOptions.map(cv => (
                  <button
                    key={cv}
                    type="button"
                    onClick={() => setFiscalPower(cv.toString())}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
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
            <Button variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button variant="gradient" className="flex-1" onClick={handleSave}>
              {editVehicle ? 'Enregistrer' : 'Ajouter le véhicule'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
