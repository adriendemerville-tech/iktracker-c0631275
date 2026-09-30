import { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Vehicle } from "@/types/trip";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Switch } from "./ui/switch";
import { Checkbox } from "./ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Car, Loader2, AlertCircle, Check, Zap, Info, Camera, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { scanRegistration, type RegistrationScanResult } from "@/lib/registration-scan.functions";

async function compressImage(file: File): Promise<{ base64: string; mime: "image/jpeg" }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const url = c.toDataURL("image/jpeg", 0.85);
  return { base64: url.split(",")[1], mime: "image/jpeg" };
}

export interface VehicleSaveOptions {
  updatePastTrips?: boolean;
  period?: { start: string; end?: string };
  setAsDefault?: boolean;
}

interface VehicleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (vehicle: Omit<Vehicle, "id">, options?: VehicleSaveOptions) => void;
  editVehicle?: Vehicle;
  vehicleCount?: number;
}

// Common French car makes for suggestion
const COMMON_MAKES = [
  "Renault",
  "Peugeot",
  "Citroën",
  "Volkswagen",
  "BMW",
  "Mercedes",
  "Audi",
  "Toyota",
  "Ford",
  "Fiat",
  "Opel",
  "Nissan",
  "Hyundai",
  "Kia",
  "Dacia",
  "Skoda",
  "Seat",
  "Tesla",
];

export function VehicleForm({ open, onOpenChange, onSave, editVehicle, vehicleCount = 0 }: VehicleFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [fiscalPower, setFiscalPower] = useState("");
  const [year, setYear] = useState("");
  const [isElectric, setIsElectric] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);
  const [updatePastTrips, setUpdatePastTrips] = useState(false);
  const [usePeriod, setUsePeriod] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scan, setScan] = useState<RegistrationScanResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scanFn = useServerFn(scanRegistration);

  // Sync form state when editVehicle changes or sheet opens
  useEffect(() => {
    if (open) {
      setFirstName(editVehicle?.ownerFirstName || "");
      setLastName(editVehicle?.ownerLastName || "");
      setLicensePlate(editVehicle?.licensePlate || "");
      setMake(editVehicle?.make === "Non renseigné" ? "" : editVehicle?.make || "");
      setModel(editVehicle?.model === "Non renseigné" ? "" : editVehicle?.model || "");
      setFiscalPower(editVehicle?.fiscalPower?.toString() || "");
      setYear(editVehicle?.year?.toString() || "");
      setIsElectric(editVehicle?.isElectric || false);
      setLookupDone(!!editVehicle);
      setUpdatePastTrips(false);
      setUsePeriod(false);
      setSetAsDefault(false);
      setPeriodStart("");
      setPeriodEnd("");
      setScan(null);
    }
  }, [open, editVehicle]);

  const formatLicensePlate = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!cleaned) return "";

    // FNI (ancien format pre-2009): commence par un chiffre. Ex: 1234-AB-56
    if (/^\d/.test(cleaned)) {
      const m = cleaned.match(/^(\d{1,4})([A-Z]{0,3})(\d{0,2})/);
      if (!m) return cleaned;
      const [, d1, letters, d2] = m;
      return [d1, letters, d2].filter(Boolean).join("-");
    }

    // SIV (format actuel): AA-123-BB
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 7)}`;
  };

  const isPlateComplete = (plate: string) => {
    // SIV: AA-123-BB | FNI: 1-4 chiffres, 1-3 lettres, 2 chiffres
    return /^[A-Z]{2}-\d{3}-[A-Z]{2}$/.test(plate) || /^\d{1,4}-[A-Z]{1,3}-\d{2}$/.test(plate);
  };

  const handleLicensePlateChange = async (value: string) => {
    const formatted = formatLicensePlate(value);
    setLicensePlate(formatted);
    setLookupDone(false);

    if (isPlateComplete(formatted) && !isLookingUp) {
      await performLookup(formatted);
    }
  };

  const performLookup = async (plate: string) => {
    setIsLookingUp(true);

    try {
      const { data, error } = await supabase.functions.invoke("vehicle-lookup", {
        body: { licensePlate: plate },
      });

      if (error) {
        console.error("Lookup error:", error);
        toast.error("Impossible de récupérer les informations du véhicule");
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
          toast.success("Véhicule détecté (données simulées)", {
            description: "Veuillez vérifier et corriger les informations si nécessaire.",
          });
        } else {
          toast.success("Véhicule trouvé !", {
            description: "Vérifiez la puissance fiscale sur votre carte grise (rubrique P.6).",
          });
        }
      } else {
        toast.error("Véhicule non trouvé", {
          description: "Veuillez saisir les informations manuellement.",
        });
      }
    } catch (err) {
      console.error("Lookup error:", err);
      toast.error("Erreur lors de la recherche");
    }

    setIsLookingUp(false);
  };

  const handleScan = async (file: File) => {
    setIsScanning(true);
    try {
      const { base64, mime } = await compressImage(file);
      const r = await scanFn({ data: { imageBase64: base64, mimeType: mime } });
      setScan(r);
      if (r.A) setLicensePlate(formatLicensePlate(r.A));
      if (r.D1) setMake(r.D1);
      if (r.D3) setModel(r.D3);
      if (r.P6) setFiscalPower(String(r.P6));
      const y = r.B?.match(/(\d{4})\s*$/)?.[1];
      if (y) setYear(y);
      if (r.P3) setIsElectric(r.P3.toUpperCase() === "EL");
      setLookupDone(true);
      toast.success("Carte grise lue", { description: "Vérifiez les informations extraites." });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lecture impossible");
    }
    setIsScanning(false);
  };

  const scanWarnings: string[] = [];
  if (scan) {
    if (!scan.P6) scanWarnings.push("P.6 illisible : sélectionnez la puissance fiscale manuellement.");
    if (!scan.C3) scanWarnings.push("C.3 illisible : vérifiez que la carte grise est à votre adresse.");
    const parse = (d: string | null) => {
      const m = d?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      return m ? new Date(`${m[3]}-${m[2]}-${m[1]}`) : null;
    };
    const b = parse(scan.B);
    const i = parse(scan.I);
    if (b && i && i < b) scanWarnings.push("Date I antérieure à la date B : vérifiez la lecture.");
    if (i && i > new Date()) scanWarnings.push("Date I dans le futur : vérifiez la lecture.");
  }

  // Determine fuel type label and color
  const getFuelTypeInfo = () => {
    if (isElectric) return { label: "Électrique", className: "bg-emerald-500 text-white" };
    // For now, we assume non-electric is thermal. Hybrid detection could be added later.
    return { label: "Thermique", className: "bg-red-500 text-white" };
  };

  const handleSave = () => {
    if (!licensePlate || !fiscalPower) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const cv = parseInt(fiscalPower);
    if (isNaN(cv) || cv < 1 || cv > 50) {
      toast.error("Puissance fiscale invalide");
      return;
    }

    if (usePeriod && !editVehicle) {
      if (!periodStart) {
        toast.error("Indiquez la date de début d'utilisation");
        return;
      }
      if (periodEnd && periodEnd < periodStart) {
        toast.error("La date de fin doit être après la date de début");
        return;
      }
    }

    const impactsPastTrips =
      !!editVehicle && (cv !== editVehicle.fiscalPower || isElectric !== !!editVehicle.isElectric);

    onSave(
      {
        name: !make.trim() && !model.trim() ? licensePlate.toUpperCase() : undefined,
        ownerFirstName: firstName.trim(),
        ownerLastName: lastName.trim(),
        licensePlate: licensePlate.toUpperCase(),
        make: make.trim() || "Non renseigné",
        model: model.trim() || "Non renseigné",
        fiscalPower: cv,
        year: year ? parseInt(year) : undefined,
        isElectric,
      },
      {
        updatePastTrips: impactsPastTrips ? updatePastTrips : false,
        setAsDefault: !editVehicle && vehicleCount > 0 && setAsDefault,
        period:
          usePeriod && !editVehicle && periodStart
            ? { start: periodStart, end: periodEnd || undefined }
            : undefined,
      },
    );

    onOpenChange(false);
  };

  const fiscalPowerOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const isPlateEmpty = !licensePlate || licensePlate.length === 0;
  const currentCv = parseInt(fiscalPower);
  const showUpdatePastToggle =
    !!editVehicle &&
    ((Number.isFinite(currentCv) && currentCv !== editVehicle.fiscalPower) ||
      isElectric !== !!editVehicle.isElectric);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="vehicle-form-modal h-auto max-h-[90dvh] sm:max-h-[calc(100dvh-3rem)] sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 w-full sm:max-w-xl sm:mx-auto rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
      >
        <div className="w-full min-h-0 flex-1 flex flex-col">
          <SheetHeader className="pb-3 sm:pb-5 shrink-0">
            <SheetTitle className="text-lg flex items-center gap-2 font-display">
              <Car className="w-5 h-5 text-primary" />
              {editVehicle ? "Modifier le véhicule" : "Ajouter un véhicule"}
            </SheetTitle>
          </SheetHeader>

          <div className="min-h-0 overflow-y-auto flex-1">
            <div className="space-y-3 sm:space-y-5 font-display">
              {/* Scan carte grise */}
              <div className="space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleScan(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 sm:h-11 font-display focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isScanning}
                  onClick={() => fileRef.current?.click()}
                >
                  {isScanning ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 mr-2" />
                  )}
                  {isScanning ? "Lecture de la carte grise…" : "Scanner la carte grise"}
                </Button>
                <p className="hidden sm:block text-[11px] text-muted-foreground">
                  Par sécurité, la photo n'est pas enregistrée : seules les données extraites et l'heure du scan sont conservées.
                </p>
                {scan && (
                  <div className="p-3 rounded-lg border bg-muted/40 space-y-1.5 text-xs">
                    <p className="font-medium flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-primary" />
                      Scan conservé le {new Date(scan.scannedAt).toLocaleString("fr-FR")}
                    </p>
                    <p>
                      <span className="text-muted-foreground">C.3 Adresse :</span>{" "}
                      {scan.C3 ?? <span className="text-destructive">non lue</span>}
                    </p>
                    <p>
                      <span className="text-muted-foreground">B 1re immat. :</span>{" "}
                      {scan.B ?? <span className="text-destructive">non lue</span>}
                    </p>
                    <p>
                      <span className="text-muted-foreground">I Date du certificat :</span>{" "}
                      {scan.I ?? <span className="text-destructive">non lue</span>}
                    </p>
                    {scanWarnings.map((w) => (
                      <p key={w} className="text-destructive flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                        {w}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-3 items-start">
              {/* License plate */}
              <div className="space-y-2 min-w-0">
                <Label htmlFor="licensePlate">Plaque d'immatriculation *</Label>
                <div className="relative">
                  <Input
                    id="licensePlate"
                    placeholder="AA-123-BB ou 1234-AB-56"
                    value={licensePlate}
                    onChange={(e) => handleLicensePlateChange(e.target.value)}
                    maxLength={11}
                    className={cn(
                      "font-mono text-sm sm:text-base pr-8 h-11 sm:h-12",
                    )}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {isLookingUp ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : lookupDone ? (
                      <Check className="w-5 h-5 text-emerald-500" />
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Fiscal Power */}
              <div className="space-y-2 min-w-0">
                <Label className="text-xs sm:text-sm whitespace-nowrap">Puissance fiscale *</Label>
                <Select
                  value={fiscalPower}
                  onValueChange={(v) => setFiscalPower(v)}
                >
                  <SelectTrigger className="h-11 sm:h-12 w-full">
                    <SelectValue placeholder="CV" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {fiscalPowerOptions.map((cv) => (
                      <SelectItem key={cv} value={cv.toString()}>
                        {cv} CV
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="hidden sm:flex text-xs text-muted-foreground items-center gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                  Rubrique P.6 de la carte grise
                </p>
              </div>
              </div>

              {/* Make / Model - editable when lookup failed or incomplete */}
              {(!lookupDone || !make || !model) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="make">Marque</Label>
                    <Input
                      id="make"
                      placeholder="Ex : Renault"
                      value={make}
                      onChange={(e) => setMake(e.target.value)}
                      list="common-makes"
                      className="h-11 sm:h-12"
                    />
                    <datalist id="common-makes">
                      {COMMON_MAKES.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Modèle</Label>
                    <Input
                      id="model"
                      placeholder="Ex : Clio"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="h-11 sm:h-12"
                    />
                  </div>
                </div>
              )}

              {/* Vehicle info - Read only display when lookup done */}
              {lookupDone && !!make && !!model && (
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Véhicule détecté</p>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {make && <span className="bg-background px-2 py-0.5 rounded">{make}</span>}
                    {model && <span className="bg-background px-2 py-0.5 rounded">{model}</span>}
                    {year && <span className="bg-background px-2 py-0.5 rounded">{year}</span>}
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        getFuelTypeInfo().className,
                      )}
                    >
                      {getFuelTypeInfo().label}
                    </span>
                  </div>
                </div>
              )}

              {/* Electric Vehicle Toggle */}
              <div
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border-2 transition-all",
                  isElectric
                    ? "border-emerald-500/50 bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20"
                    : "border-border bg-card",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      isElectric ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground",
                    )}
                  >
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
                <Switch id="electric" checked={isElectric} onCheckedChange={setIsElectric} />
              </div>

              {!editVehicle && vehicleCount > 0 && (
                <label htmlFor="defaultVehicle" className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox
                    id="defaultVehicle"
                    checked={setAsDefault}
                    onCheckedChange={(value) => setSetAsDefault(value === true)}
                  />
                  <span className="text-sm font-semibold">Véhicule principal</span>
                </label>
              )}

              {/* Retroactive period (new vehicle only) */}
              {!editVehicle && (
                <div className="rounded-xl border-2 border-border p-3 space-y-3">
                  <label htmlFor="usePeriod" className="flex items-center gap-2.5 cursor-pointer">
                    <Checkbox
                      id="usePeriod"
                      checked={usePeriod}
                      onCheckedChange={(v) => setUsePeriod(v === true)}
                    />
                    <span className="text-sm font-semibold">
                      J'utilisais déjà ce véhicule (trajets passés)
                    </span>
                  </label>
                  {usePeriod && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="periodStart" className="text-xs">Depuis le *</Label>
                          <Input
                            id="periodStart"
                            type="date"
                            value={periodStart}
                            max={new Date().toISOString().slice(0, 10)}
                            onChange={(e) => setPeriodStart(e.target.value)}
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="periodEnd" className="text-xs">Jusqu'au (optionnel)</Label>
                          <Input
                            id="periodEnd"
                            type="date"
                            value={periodEnd}
                            min={periodStart || undefined}
                            onChange={(e) => setPeriodEnd(e.target.value)}
                            className="h-10"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug">
                        Les trajets de cette période (hors saisies manuelles) passeront sur ce véhicule, et les indemnités seront recalculées. Les nouveaux trajets restent sur le véhicule par défaut.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Retroactive recalculation toggle */}
              {showUpdatePastToggle && (
                <label
                  htmlFor="updatePastTrips"
                  className="flex items-start gap-3 p-3 rounded-xl border-2 border-primary/30 bg-primary/5 cursor-pointer"
                >
                  <Switch
                    id="updatePastTrips"
                    checked={updatePastTrips}
                    onCheckedChange={setUpdatePastTrips}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-semibold">Mettre à jour les trajets passés</div>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {updatePastTrips
                        ? "Les indemnités de tous vos trajets passés liés à ce véhicule seront immédiatement recalculées avec le nouveau barème."
                        : "Seuls les trajets à venir utiliseront le nouveau barème. Les trajets passés conservent leurs indemnités actuelles."}
                    </p>
                  </div>
                </label>
              )}

            </div>
          </div>
          <div className="flex gap-3 pt-4 shrink-0">
            <Button
              variant="secondary"
              className="flex-1 font-display"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button variant="gradient" className="flex-1 font-display" onClick={handleSave}>
              {editVehicle ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
