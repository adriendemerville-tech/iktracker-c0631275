import { useState, useEffect, lazy, Suspense } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Car, MapPin, Calculator, CalendarClock, SlidersHorizontal, Plus, Home, Mail, Bell, FileDown, Repeat, Zap, Trash2, AlertTriangle, ArchiveRestore } from 'lucide-react';
import { Vehicle, Location as TripLocation } from '@/types/trip';
import { usePreferences, IKRateOverride, CalendarImportMode } from '@/hooks/usePreferences';
import { VehicleCard } from '@/components/VehicleCard';
import { AddressCard } from '@/components/AddressCard';
import { toast } from '@/components/ui/sonner';

const VehicleForm = lazy(() => import('@/components/VehicleForm').then(m => ({ default: m.VehicleForm })));
const AddressForm = lazy(() => import('@/components/AddressForm').then(m => ({ default: m.AddressForm })));
const CalendarConnections = lazy(() => import('@/components/CalendarConnections').then(m => ({ default: m.CalendarConnections })));

type TabId = 'vehicles' | 'addresses' | 'calculation' | 'import' | 'general' | 'danger';

interface Tab {
  id: TabId;
  label: string;
  icon: typeof Car;
}

const TABS: Tab[] = [
  { id: 'vehicles', label: 'Véhicules', icon: Car },
  { id: 'addresses', label: 'Adresses', icon: MapPin },
  { id: 'calculation', label: 'Calcul & fiscalité', icon: Calculator },
  { id: 'import', label: 'Import & tournées', icon: CalendarClock },
  { id: 'general', label: 'Général', icon: SlidersHorizontal },
  { id: 'danger', label: 'Zone de danger', icon: AlertTriangle },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
  savedLocations: TripLocation[];
  getTotalAnnualKm: (vehicleId: string) => number;
  onAddVehicle: (v: Omit<Vehicle, 'id'>) => void;
  onUpdateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  onDeleteVehicle: (id: string) => void;
  onAddLocation: (loc: Omit<TripLocation, 'id'>) => Promise<TripLocation | null> | TripLocation | null | void;
  onUpdateLocation: (id: string, updates: Partial<TripLocation>) => void;
  onDeleteLocation: (id: string) => void;
  onOpenRecurring: () => void;
  onDeleteAllTrips: () => Promise<{ success: boolean; count: number }>;
  onGetWipeBackupInfo: () => Promise<
    { available: false } | { available: true; count: number; wipedAt: string; daysLeft: number }
  >;
  onRestoreWipedTrips: (mode: 'merge' | 'replace') => Promise<{ success: boolean; restored: number }>;
  currentTripsCount: number;
}


export function TripSettingsModal(props: Props) {
  const {
    open, onOpenChange, vehicles, savedLocations, getTotalAnnualKm,
    onAddVehicle, onUpdateVehicle, onDeleteVehicle,
    onAddLocation, onUpdateLocation, onDeleteLocation,
    onOpenRecurring, onDeleteAllTrips,
    onGetWipeBackupInfo, onRestoreWipedTrips, currentTripsCount,
  } = props;
  const { preferences, updatePreference } = usePreferences();
  const [activeTab, setActiveTab] = useState<TabId>('vehicles');

  // Nested form states
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<TripLocation | null>(null);

  // Danger zone: wipe all trips
  const [wipeConfirmOpen, setWipeConfirmOpen] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [wipeLoading, setWipeLoading] = useState(false);

  // Danger zone: restore backup
  const [backupInfo, setBackupInfo] = useState<
    { available: false } | { available: true; count: number; wipedAt: string; daysLeft: number }
  >({ available: false });
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreConflictOpen, setRestoreConflictOpen] = useState(false);

  // Load backup info when opening the danger tab (or modal itself)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    onGetWipeBackupInfo().then((info) => {
      if (!cancelled) setBackupInfo(info);
    }).catch(() => { /* noop */ });
    return () => { cancelled = true; };
  }, [open, activeTab, onGetWipeBackupInfo]);

  const doRestore = async (mode: 'merge' | 'replace') => {
    setRestoreLoading(true);
    const res = await onRestoreWipedTrips(mode);
    setRestoreLoading(false);
    setRestoreConflictOpen(false);
    if (res.success) {
      toast.success(
        `${res.restored} trajet${res.restored > 1 ? 's' : ''} restauré${res.restored > 1 ? 's' : ''}${
          mode === 'replace' ? ' (journal actuel remplacé)' : ''
        }.`
      );
      const info = await onGetWipeBackupInfo();
      setBackupInfo(info);
    } else {
      toast.error('Échec de la restauration. Réessayez.');
    }
  };



  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden gap-0" style={{ height: 'min(80vh, 720px)' }}>
          <DialogTitle className="sr-only">Réglages des trajets</DialogTitle>
          <div className="flex h-full min-h-0">
            {/* Left sidebar */}
            <aside className="w-56 shrink-0 border-r border-border bg-muted/30 flex flex-col">
              <div className="px-4 py-4 border-b border-border">
                <h2 className="text-sm font-semibold">Réglages</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Trajets & préférences</p>
              </div>
              <nav className="flex-1 overflow-y-auto py-2 flex flex-col">
                {TABS.filter(t => t.id !== 'danger').map(tab => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors border-l-2",
                        active
                          ? "bg-background text-foreground border-primary font-medium"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background/50"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
                {/* Danger zone pinned to the bottom */}
                <div className="mt-auto pt-4 border-t border-border">
                  {(() => {
                    const tab = TABS.find(t => t.id === 'danger')!;
                    const Icon = tab.icon;
                    const active = activeTab === 'danger';
                    return (
                      <button
                        onClick={() => setActiveTab('danger')}
                        className={cn(
                          "w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors border-l-2",
                          active
                            ? "bg-destructive/10 text-destructive border-destructive font-medium"
                            : "border-transparent text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })()}
                </div>
              </nav>

            </aside>

            {/* Content */}
            <div className="flex-1 min-w-0 overflow-y-auto">
              <div className="px-6 py-6">
                {activeTab === 'vehicles' && (
                  <section className="space-y-4">
                    <SectionHeader
                      title="Véhicules"
                      description="Gérez vos véhicules et choisissez celui utilisé par défaut."
                      action={
                        <Button size="sm" variant="outline" onClick={() => { setEditingVehicle(null); setVehicleFormOpen(true); }}>
                          <Plus className="w-4 h-4 mr-1" /> Ajouter
                        </Button>
                      }
                    />

                    {vehicles.length === 0 ? (
                      <EmptyState icon={Car} label="Aucun véhicule enregistré" />
                    ) : (
                      <div className="space-y-3">
                        {vehicles.map(v => (
                          <VehicleCard
                            key={v.id}
                            vehicle={v}
                            totalKm={getTotalAnnualKm(v.id)}
                            onEdit={() => { setEditingVehicle(v); setVehicleFormOpen(true); }}
                            onDelete={() => {
                              if (window.confirm('Supprimer ce véhicule ?')) {
                                onDeleteVehicle(v.id);
                                if (preferences.defaultVehicleId === v.id) {
                                  updatePreference('defaultVehicleId', null);
                                }
                              }
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {vehicles.length > 0 && (
                      <div className="pt-4 border-t border-border space-y-2">
                        <Label>Véhicule par défaut</Label>
                        <Select
                          value={preferences.defaultVehicleId ?? '__none__'}
                          onValueChange={v => updatePreference('defaultVehicleId', v === '__none__' ? null : v)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Aucun — demander à chaque fois</SelectItem>
                            {vehicles.map(v => (
                              <SelectItem key={v.id} value={v.id}>
                                {[v.make, v.model].filter(Boolean).join(' ') || v.licensePlate || 'Véhicule'}
                                {v.isElectric ? ' ⚡' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Utilisé pour les imports calendrier et les nouveaux trajets.
                        </p>
                      </div>
                    )}
                  </section>
                )}

                {activeTab === 'addresses' && (
                  <section className="space-y-4">
                    <SectionHeader
                      title="Adresses"
                      description="Domicile, bureau, clients — utilisés pour le calcul automatique des distances."
                      action={
                        <Button size="sm" variant="outline" onClick={() => { setEditingAddress(null); setAddressFormOpen(true); }}>
                          <Plus className="w-4 h-4 mr-1" /> Ajouter
                        </Button>
                      }
                    />

                    {!savedLocations.some(l => l.type === 'home' && l.address) && (
                      <div className="bg-warning/10 border border-warning/30 rounded-md p-3 text-sm text-warning-foreground flex items-start gap-2">
                        <Home className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>Ajoutez votre domicile pour que les imports calendrier soient calculés automatiquement.</span>
                      </div>
                    )}

                    {savedLocations.length === 0 ? (
                      <EmptyState icon={MapPin} label="Aucune adresse enregistrée" />
                    ) : (
                      <div className="space-y-3">
                        {savedLocations.map(loc => (
                          <AddressCard
                            key={loc.id}
                            location={{
                              id: loc.id,
                              name: loc.name,
                              address: loc.address,
                              type: loc.type as 'home' | 'office' | 'other',
                            }}
                            onEdit={() => { setEditingAddress(loc); setAddressFormOpen(true); }}
                            onDelete={() => {
                              onDeleteLocation(loc.id);
                              toast.success('Adresse supprimée');
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {activeTab === 'calculation' && (
                  <section className="space-y-6">
                    <SectionHeader
                      title="Calcul & fiscalité"
                      description="Barème IK, exercice fiscal, seuils et destinataire des relevés."
                    />

                    {/* IK rate override */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Calculator className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <Label>Taux d'indemnité kilométrique</Label>
                          <p className="text-xs text-muted-foreground">Utile pour figer un taux stable sur l'année.</p>
                        </div>
                      </div>
                      <div className="pl-8">
                        <Select
                          value={preferences.ikRateOverride}
                          onValueChange={v => updatePreference('ikRateOverride', v as IKRateOverride)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Automatique (barème officiel)</SelectItem>
                            <SelectItem value="tier2">Tranche 5 001–20 000 km · 31,6 à 39,4 c€/km</SelectItem>
                            <SelectItem value="tier3">Tranche &gt; 20 000 km · 37,0 à 47,0 c€/km</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="pl-8 text-[11px] text-muted-foreground italic">
                        Le bonus véhicule électrique (+20 %) reste appliqué. Les trajets déjà enregistrés ne sont pas recalculés.
                      </p>
                    </div>

                    {/* Fiscal year start */}
                    <div className="pt-4 border-t border-border space-y-3">
                      <div className="flex items-center gap-3">
                        <CalendarClock className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <Label>Début d'exercice fiscal</Label>
                          <p className="text-xs text-muted-foreground">Date à laquelle le cumul annuel est remis à zéro.</p>
                        </div>
                      </div>
                      <div className="pl-8 flex items-center gap-2">
                        <Input
                          type="number" min={1} max={31}
                          value={preferences.fiscalYearStartDay}
                          onChange={e => updatePreference('fiscalYearStartDay', Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                          className="w-20"
                        />
                        <Select
                          value={String(preferences.fiscalYearStartMonth)}
                          onValueChange={v => updatePreference('fiscalYearStartMonth', parseInt(v))}
                        >
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'].map((m, i) => (
                              <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Min distance */}
                    <div className="pt-4 border-t border-border space-y-3">
                      <div className="flex items-center gap-3">
                        <SlidersHorizontal className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <Label>Distance minimum d'enregistrement</Label>
                          <p className="text-xs text-muted-foreground">Sous ce seuil, un trajet n'est pas créé.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 pl-8">
                        <Slider
                          value={[preferences.minDistanceKm]}
                          onValueChange={([v]) => updatePreference('minDistanceKm', v)}
                          min={0} max={5} step={0.5}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium w-16 text-right tabular-nums">{preferences.minDistanceKm} km</span>
                      </div>
                    </div>

                    {/* Accountant email */}
                    <div className="pt-4 border-t border-border space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <Label htmlFor="acc-email">Email du comptable</Label>
                          <p className="text-xs text-muted-foreground">Destinataire par défaut des relevés.</p>
                        </div>
                      </div>
                      <div className="pl-8">
                        <Input
                          id="acc-email"
                          type="email"
                          placeholder="comptable@exemple.fr"
                          value={preferences.accountantEmail}
                          onChange={e => updatePreference('accountantEmail', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Trip defaults */}
                    <div className="pt-4 border-t border-border space-y-3">
                      <Label>Valeurs par défaut des nouveaux trajets</Label>
                      <div className="pl-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="def-purpose" className="w-32 text-sm font-normal text-muted-foreground">Motif</Label>
                          <Input
                            id="def-purpose"
                            placeholder="ex. Client, Chantier…"
                            value={preferences.defaultPurpose}
                            onChange={e => updatePreference('defaultPurpose', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="def-rt" className="text-sm font-normal text-muted-foreground">Aller-retour par défaut</Label>
                          <Switch
                            id="def-rt"
                            checked={preferences.defaultRoundTrip}
                            onCheckedChange={c => updatePreference('defaultRoundTrip', c)}
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {activeTab === 'import' && (
                  <section className="space-y-6">
                    <SectionHeader
                      title="Import & tournées"
                      description="Connexions calendrier, mode d'import et détection d'étapes."
                    />

                    {/* Calendar connections */}
                    <div className="space-y-3">
                      <Suspense fallback={<div className="text-sm text-muted-foreground">Chargement…</div>}>
                        <CalendarConnections />
                      </Suspense>
                    </div>

                    {/* Import mode */}
                    <div className="pt-4 border-t border-border space-y-3">
                      <div className="flex items-center gap-3">
                        <CalendarClock className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <Label>Mode d'import calendrier</Label>
                          <p className="text-xs text-muted-foreground">Comportement lors de la synchronisation.</p>
                        </div>
                      </div>
                      <RadioGroup
                        value={preferences.calendarImportMode}
                        onValueChange={v => updatePreference('calendarImportMode', v as CalendarImportMode)}
                        className="pl-8 space-y-2"
                      >
                        <RadioOption id="cal-ind" value="individual" title="Trajets individuels" desc="Chaque événement devient un aller-retour depuis mon domicile." />
                        <RadioOption id="cal-tour" value="tour" title="Tournée journalière" desc="Tous les RDV d'une même journée : domicile → étapes → domicile." />
                      </RadioGroup>
                    </div>

                    {/* Recurring trips */}
                    <div className="pt-4 border-t border-border">
                      <Button variant="outline" className="w-full justify-start" onClick={() => { onOpenChange(false); onOpenRecurring(); }}>
                        <Repeat className="w-4 h-4 mr-2" />
                        Gérer les trajets récurrents
                      </Button>
                    </div>

                    {/* Tour mode detection */}
                    <div className="pt-4 border-t border-border space-y-3">
                      <Label>Détection d'étapes (mode Tournée mobile)</Label>
                      <div className="pl-1 space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Durée d'arrêt</span>
                            <span className="text-sm font-medium tabular-nums">{preferences.stopDetectionMinutes} min</span>
                          </div>
                          <Slider
                            value={[preferences.stopDetectionMinutes]}
                            onValueChange={([v]) => updatePreference('stopDetectionMinutes', v)}
                            min={1} max={15} step={1}
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Rayon d'un même lieu</span>
                            <span className="text-sm font-medium tabular-nums">{preferences.locationRadiusMeters} m</span>
                          </div>
                          <Slider
                            value={[preferences.locationRadiusMeters]}
                            onValueChange={([v]) => updatePreference('locationRadiusMeters', v)}
                            min={50} max={300} step={25}
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {activeTab === 'general' && (
                  <section className="space-y-6">
                    <SectionHeader
                      title="Général"
                      description="Affichage, notifications et automatisations."
                    />

                    {/* Display */}
                    <div className="space-y-3">
                      <ToggleRow
                        label="Afficher l'heure des trajets"
                        checked={preferences.showTripTime}
                        onChange={c => updatePreference('showTripTime', c)}
                      />
                    </div>

                    {/* Notifications */}
                    <div className="pt-4 border-t border-border space-y-3">
                      <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-muted-foreground" />
                        <Label>Notifications</Label>
                      </div>
                      <div className="pl-1 space-y-3">
                        <ToggleRow
                          label="Rappel de finalisation de tournée"
                          desc="Notification si une tournée reste ouverte en fin de journée."
                          checked={preferences.notifTourReminder}
                          onChange={c => updatePreference('notifTourReminder', c)}
                        />
                        <ToggleRow
                          label="Alerte seuil annuel"
                          desc="Prévient à l'approche des paliers 5 000 / 20 000 km."
                          checked={preferences.notifAnnualThreshold}
                          onChange={c => updatePreference('notifAnnualThreshold', c)}
                        />
                      </div>
                    </div>

                    {/* Automation */}
                    <div className="pt-4 border-t border-border space-y-3">
                      <div className="flex items-center gap-3">
                        <FileDown className="w-5 h-5 text-muted-foreground" />
                        <Label>Automatisations</Label>
                      </div>
                      <div className="pl-1">
                        <ToggleRow
                          label="Export mensuel automatique"
                          desc={preferences.accountantEmail
                            ? `Le 1er de chaque mois, le relevé est envoyé à ${preferences.accountantEmail}.`
                            : "Renseignez l'email du comptable dans « Calcul & fiscalité »."}
                          checked={preferences.autoMonthlyExport}
                          onChange={c => {
                            if (c && !preferences.accountantEmail) {
                              toast.error("Renseignez d'abord l'email du comptable");
                              return;
                            }
                            updatePreference('autoMonthlyExport', c);
                          }}
                        />
                      </div>
                    </div>
                  </section>
                )}

                {activeTab === 'danger' && (
                  <section className="space-y-6">
                    <SectionHeader
                      title="Zone de danger"
                      description="Actions irréversibles depuis l'application. Réfléchissez à deux fois."
                    />

                    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-destructive">Supprimer tous mes trajets</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Vide entièrement votre journal : trajets, tournées et archives disparaissent de l'application.
                            Vos véhicules, adresses et préférences ne sont pas touchés.
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Les données sont conservées <strong>120 jours</strong> en base pour une éventuelle restauration
                            sur demande, puis définitivement effacées.
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => { setWipeConfirmText(''); setWipeConfirmOpen(true); }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer tous mes trajets
                        </Button>
                      </div>
                    </div>

                    {/* Restore backup (only visible if a wipe backup is available) */}
                    {backupInfo.available && (
                      <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <ArchiveRestore className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-primary">Restaurer ma dernière sauvegarde</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Une sauvegarde de <strong>{backupInfo.count} trajet{backupInfo.count > 1 ? 's' : ''}</strong> supprimé{backupInfo.count > 1 ? 's' : ''}
                              {' '}le {new Date(backupInfo.wipedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} est encore récupérable.
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Il reste <strong>{backupInfo.daysLeft} jour{backupInfo.daysLeft > 1 ? 's' : ''}</strong> avant la purge définitive.
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            disabled={restoreLoading}
                            onClick={async () => {
                              // No conflict → restore directly (merge is a no-op if no current trips)
                              if (currentTripsCount === 0) {
                                await doRestore('merge');
                              } else {
                                setRestoreConflictOpen(true);
                              }
                            }}
                          >
                            <ArchiveRestore className="w-4 h-4 mr-2" />
                            {restoreLoading ? 'Restauration…' : 'Restaurer la sauvegarde'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </section>
                )}

              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation modal for wiping all trips */}
      <Dialog open={wipeConfirmOpen} onOpenChange={(o) => { if (!wipeLoading) setWipeConfirmOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Supprimer tous mes trajets ?
          </DialogTitle>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cette action vide entièrement votre journal : <strong>tous les trajets, toutes les tournées
              et toutes les archives</strong> seront retirés de l'application.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vos données restent conservées 120 jours en base pour une restauration éventuelle, puis
              sont définitivement effacées.
            </p>
            <div className="space-y-2">
              <Label htmlFor="wipe-confirm" className="text-sm">
                Pour confirmer, tapez <span className="font-mono font-semibold text-destructive">SUPPRIMER</span> :
              </Label>
              <Input
                id="wipe-confirm"
                value={wipeConfirmText}
                onChange={(e) => setWipeConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
                autoComplete="off"
                disabled={wipeLoading}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setWipeConfirmOpen(false)}
                disabled={wipeLoading}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                disabled={wipeConfirmText !== 'SUPPRIMER' || wipeLoading}
                onClick={async () => {
                  setWipeLoading(true);
                  const res = await onDeleteAllTrips();
                  setWipeLoading(false);
                  if (res.success) {
                    toast.success(`${res.count} trajet${res.count > 1 ? 's' : ''} supprimé${res.count > 1 ? 's' : ''}. Journal vidé.`);
                    setWipeConfirmOpen(false);
                    setWipeConfirmText('');
                    onOpenChange(false);
                  } else {
                    toast.error("Échec de la suppression. Réessayez.");
                  }
                }}
              >
                {wipeLoading ? 'Suppression…' : 'Supprimer définitivement'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conflict modal: current journal not empty → merge or replace? */}
      <Dialog open={restoreConflictOpen} onOpenChange={(o) => { if (!restoreLoading) setRestoreConflictOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogTitle className="flex items-center gap-2 text-primary">
            <ArchiveRestore className="w-5 h-5" />
            Restaurer votre sauvegarde
          </DialogTitle>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Votre journal actuel contient déjà <strong>{currentTripsCount} trajet{currentTripsCount > 1 ? 's' : ''}</strong>{' '}
              enregistré{currentTripsCount > 1 ? 's' : ''} depuis la suppression.
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              En restaurant votre sauvegarde{backupInfo.available ? ` (${backupInfo.count} trajet${backupInfo.count > 1 ? 's' : ''})` : ''},
              souhaitez-vous <strong>conserver</strong> ou <strong>écraser</strong> les trajets et tournées actuellement présents dans votre journal ?
            </p>
            <div className="space-y-2 pt-1">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3"
                disabled={restoreLoading}
                onClick={() => doRestore('merge')}
              >
                <div className="text-left">
                  <div className="text-sm font-medium">Conserver mes trajets actuels</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Fusionne la sauvegarde avec le journal existant (recommandé).
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3 border-destructive/50 hover:bg-destructive/5"
                disabled={restoreLoading}
                onClick={() => doRestore('replace')}
              >
                <div className="text-left">
                  <div className="text-sm font-medium text-destructive">Écraser mon journal actuel</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Les {currentTripsCount} trajet{currentTripsCount > 1 ? 's' : ''} actuel{currentTripsCount > 1 ? 's' : ''} rejoindra la corbeille (récupérable 120 j).
                  </div>
                </div>
              </Button>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="ghost" size="sm" disabled={restoreLoading} onClick={() => setRestoreConflictOpen(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      <Suspense fallback={null}>
        {vehicleFormOpen && (
          <VehicleForm
            open={vehicleFormOpen}
            onOpenChange={setVehicleFormOpen}
            editVehicle={editingVehicle ?? undefined}
            onSave={(v) => {
              if (editingVehicle) {
                onUpdateVehicle(editingVehicle.id, v);
              } else {
                onAddVehicle(v);
              }
              setVehicleFormOpen(false);
              setEditingVehicle(null);
            }}
          />
        )}
        {addressFormOpen && (
          <AddressForm
            open={addressFormOpen}
            onOpenChange={setAddressFormOpen}
            editLocation={editingAddress ? {
              id: editingAddress.id,
              name: editingAddress.name,
              address: editingAddress.address,
              type: editingAddress.type as 'home' | 'office' | 'other',
              latitude: editingAddress.lat,
              longitude: editingAddress.lng,
            } : undefined}
            onSave={(data) => {
              if (editingAddress) {
                onUpdateLocation(editingAddress.id, {
                  name: data.name,
                  address: data.address,
                  type: data.type,
                  lat: data.latitude,
                  lng: data.longitude,
                });
                toast.success('Adresse mise à jour');
              } else {
                onAddLocation({
                  name: data.name,
                  address: data.address || '',
                  type: data.type,
                  lat: data.latitude,
                  lng: data.longitude,
                });
                toast.success('Adresse ajoutée');
              }
              setAddressFormOpen(false);
              setEditingAddress(null);
            }}
          />
        )}
      </Suspense>
    </>
  );
}

/* ------------ Small internal helpers ------------ */

function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ icon: Icon, label }: { icon: typeof Car; label: string }) {
  return (
    <div className="text-center py-10 text-muted-foreground">
      <Icon className="w-10 h-10 mx-auto mb-2 opacity-50" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function RadioOption({ id, value, title, desc }: { id: string; value: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <RadioGroupItem value={value} id={id} className="mt-1" />
      <Label htmlFor={id} className="cursor-pointer font-normal leading-snug">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </Label>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <Label className="cursor-pointer text-sm">{label}</Label>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
