import { useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTrips } from '@/hooks/useTrips';
import { Trip, Vehicle, getIKBareme, IK_BAREME_2024, calculateTotalAnnualIK } from '@/types/trip';
import { TripCard } from '@/components/TripCard';
import { ThresholdAlert } from '@/components/ThresholdAlert';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Calendar, Download, Plus, UserCircle, Mail, Pencil, Send, Car, ChevronDown, MapPin, Clock, Calculator, Home, RefreshCw, AlertTriangle } from 'lucide-react';
import { removeCountryFromAddress } from '@/lib/geocoding';
import { useAuth } from '@/hooks/useAuth';
import { usePreferences } from '@/hooks/usePreferences';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { loadZip, preloadZip } from '@/lib/pdf-utils';
import { printReport, generatePrintableHTML } from '@/lib/print-utils';

// Lazy load heavy components
const NewTripSheet = lazy(() => import('@/components/NewTripSheet').then(m => ({ default: m.NewTripSheet })));
const VehicleForm = lazy(() => import('@/components/VehicleForm').then(m => ({ default: m.VehicleForm })));
const ArchivedTripsSection = lazy(() => import('@/components/ArchivedTripsSection').then(m => ({ default: m.ArchivedTripsSection })));

const SheetLoader = () => <div className="p-4 text-center text-muted-foreground">Chargement...</div>;

export default function Report() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { trips, archivedTrips, vehicles, savedLocations, deleteTrip, restoreTrip, permanentlyDeleteTrip, updateTrip, addTrip, addLocation, updateLocation, deleteLocation, addVehicle, updateVehicle, deleteVehicle, getTotalAnnualKm } = useTrips();
  const { user } = useAuth();
  const { preferences, updatePreference } = usePreferences();
  
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditingAccountantEmail, setIsEditingAccountantEmail] = useState(false);
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [showToursDropdown, setShowToursDropdown] = useState(false);
  const [showBaremeDropdown, setShowBaremeDropdown] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  
  const totalKm = trips.reduce((sum, t) => sum + t.distance, 0);
  const totalIK = trips.reduce((sum, t) => sum + t.ikAmount, 0);
  
  // Count trips with 0km distance
  const tripsWithZeroKm = useMemo(() => trips.filter(t => t.distance === 0), [trips]);
  const hasZeroKmTrips = tripsWithZeroKm.length > 0;
  
  // Check if user has a home address configured
  const hasHomeAddress = useMemo(() => {
    return savedLocations.some(loc => loc.type === 'home' && loc.address);
  }, [savedLocations]);
  
  const handleRecalculateDistances = async () => {
    if (!hasHomeAddress) {
      toast.error("Adresse manquante", {
        description: "Configurez d'abord votre adresse de domicile dans 'Mes adresses'",
      });
      return;
    }
    
    setIsRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('recalculate-distances');
      
      if (error) throw error;
      
      if (data?.updated > 0) {
        toast.success(`${data.updated} trajet(s) recalculé(s)`, {
          description: "La page va se rafraîchir",
        });
        setTimeout(() => window.location.reload(), 1500);
      } else if (data?.skipped > 0) {
        toast.info("Aucun trajet à recalculer", {
          description: `${data.skipped} trajet(s) ignoré(s) - vérifiez vos adresses`,
        });
      } else {
        toast.info("Aucun trajet à recalculer");
      }
    } catch (error) {
      console.error('Recalculation error:', error);
      toast.error("Erreur lors du recalcul");
    } finally {
      setIsRecalculating(false);
    }
  };

  const groupedByMonth = trips.reduce((acc, trip) => {
    const month = new Date(trip.startTime).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
    if (!acc[month]) acc[month] = [];
    acc[month].push(trip);
    return acc;
  }, {} as Record<string, Trip[]>);

  const getVehicle = (vehicleId: string) => vehicles.find(v => v.id === vehicleId);

  // Filter trips that are tours (have tourStops)
  const pastTours = useMemo(() => {
    return trips.filter(trip => trip.tourStops && trip.tourStops.length > 0)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [trips]);

  const selectedTour = pastTours.find(t => t.id === selectedTourId);

  const formatTourDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Recalculate IK amounts based on chronological order and cumulative distance
  // This ensures the barème tiers are correctly applied
  const recalculatedTrips = useMemo(() => {
    // Group trips by vehicle and year
    const grouped = new Map<string, Trip[]>();
    
    trips.forEach(trip => {
      const year = new Date(trip.startTime).getFullYear();
      const key = `${trip.vehicleId}-${year}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(trip);
    });

    const result: (Trip & { recalculatedIK: number; cumulativeKm: number; appliedRate: number })[] = [];

    grouped.forEach((vehicleTrips, key) => {
      const vehicleId = key.split('-')[0];
      const vehicle = getVehicle(vehicleId);
      
      // Sort chronologically
      const sorted = [...vehicleTrips].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      let cumulativeKm = 0;

      sorted.forEach(trip => {
        const prevCumulativeKm = cumulativeKm;
        cumulativeKm += trip.distance;

        // If vehicle not found, use default values
        if (!vehicle) {
          result.push({
            ...trip,
            recalculatedIK: trip.ikAmount,
            cumulativeKm,
            appliedRate: 0,
          });
          return;
        }

        // Calculate marginal IK for this trip
        const ikBefore = calculateTotalAnnualIK(prevCumulativeKm, vehicle.fiscalPower);
        const ikAfter = calculateTotalAnnualIK(cumulativeKm, vehicle.fiscalPower);
        const recalculatedIK = ikAfter - ikBefore;

        // Determine applied rate based on cumulative km
        const bareme = getIKBareme(vehicle.fiscalPower);
        let appliedRate = bareme.upTo5000.rate;
        if (cumulativeKm > 20000) {
          appliedRate = bareme.over20000.rate;
        } else if (cumulativeKm > 5000) {
          appliedRate = bareme.from5001To20000.rate;
        }

        result.push({
          ...trip,
          recalculatedIK,
          cumulativeKm,
          appliedRate,
        });
      });
    });

    // Sort by date descending for display
    return result.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [trips, vehicles]);

  // Recalculated totals
  const recalculatedTotalIK = recalculatedTrips.reduce((sum, t) => sum + t.recalculatedIK, 0);
  
  const handleAddVehicle = () => {
    setEditingVehicle(null);
    setShowVehicleForm(true);
  };

  const IKTRACKER_URL = 'https://iktracker.lovable.app';
  const IKTRACKER_MENTION = `Généré conformément à la législation par IKtracker, outil gratuit de suivi des indemnités kilométriques. ${IKTRACKER_URL}`;

  const generateReadmeContent = () => {
    return `=== IKtracker ===

Application gratuite de suivi des indemnités kilométriques.

But : Simplifier le suivi et le calcul de vos indemnités kilométriques professionnelles conformément au barème fiscal en vigueur.

Fonctionnalités :
- Enregistrement des trajets professionnels
- Calcul automatique des indemnités selon le barème fiscal
- Génération de relevés PDF et CSV pour votre comptable
- Suivi en temps réel avec la fonction "Tournée"

C'est 100% GRATUIT !

Lien : ${IKTRACKER_URL}

---
${IKTRACKER_MENTION}
`;
  };

  const generateCSVContent = () => {
    const vehicle = vehicles.length > 0 ? vehicles[0] : null;
    const ownerName = vehicle ? `${vehicle.ownerFirstName || ''} ${vehicle.ownerLastName || ''}`.trim() : '';
    const vehicleName = vehicle ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() : '';
    const fiscalPower = vehicle?.fiscalPower ? `${vehicle.fiscalPower} CV` : '';
    const licensePlate = vehicle?.licensePlate || '';
    
    const headers = [
      'Date',
      'Propriétaire',
      'Véhicule',
      'Immatriculation',
      'Puissance fiscale (CV)',
      'Lieu de départ',
      "Lieu d'arrivée",
      'Distance (km)',
      'Cumul annuel (km)',
      'Motif',
      'Taux appliqué (€/km)',
      'Montant IK (€)',
    ];

    // Sort chronologically for CSV export
    const sortedTrips = [...recalculatedTrips].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const rows = sortedTrips.map(t => {
      const tripVehicle = getVehicle(t.vehicleId);

      return [
        new Date(t.startTime).toLocaleDateString('fr-FR'),
        tripVehicle ? `${tripVehicle.ownerFirstName} ${tripVehicle.ownerLastName}` : '',
        tripVehicle ? `${tripVehicle.make} ${tripVehicle.model}` : '',
        tripVehicle?.licensePlate || '',
        tripVehicle?.fiscalPower?.toString() || '',
        t.startLocation.name,
        t.endLocation.name,
        t.distance.toFixed(1),
        t.cumulativeKm.toFixed(1),
        t.purpose,
        t.appliedRate.toFixed(3),
        t.recalculatedIK.toFixed(2),
      ];
    });

    rows.push([]);
    rows.push(['TOTAL', '', '', '', '', '', '', totalKm.toFixed(1), '', '', '', recalculatedTotalIK.toFixed(2)]);
    
    rows.push([]);
    rows.push(['Barème kilométrique fiscal 2025']);
    rows.push(['CV', "Jusqu'à 5000 km", '5001 à 20000 km', 'Au-delà de 20000 km']);
    IK_BAREME_2024.forEach(b => {
      rows.push([
        b.cv === '7+' ? '7 CV et plus' : `${b.cv} CV`,
        `d × ${b.upTo5000.rate}`,
        `(d × ${b.from5001To20000.rate}) + ${b.from5001To20000.fixed}`,
        `d × ${b.over20000.rate}`,
      ]);
    });

    // Add IKtracker mention at the end
    rows.push([]);
    rows.push([IKTRACKER_MENTION]);
    rows.push([IKTRACKER_URL]);

    // Build header info section
    const headerInfo = [
      IKTRACKER_MENTION,
      '',
      '=== INFORMATIONS CONDUCTEUR ET VÉHICULE ===',
      `Propriétaire;${ownerName}`,
      `Véhicule;${vehicleName}`,
      `Puissance fiscale;${fiscalPower}`,
      `Immatriculation;${licensePlate}`,
      '',
      '=== DÉTAIL DES TRAJETS ===',
    ];

    const csv = [
      ...headerInfo,
      headers.join(';'),
      ...rows.map(r => r.join(';')),
    ].join('\n');

    return '\uFEFF' + csv; // BOM for Excel
  };

  // Generate HTML content for PDF (used in ZIP export)
  const generateHTMLContent = () => {
    return generatePrintableHTML({
      trips,
      vehicles,
      totalKm,
      logoUrl: '/logo-iktracker-250.webp',
    });
  };

  // Direct print function (opens browser print dialog)
  const handlePrint = () => {
    printReport({
      trips,
      vehicles,
      totalKm,
      logoUrl: '/logo-iktracker-250.webp',
    });
  };

  const exportZip = async () => {
    if (trips.length === 0) {
      toast.error("Aucun trajet à exporter");
      return;
    }

    setIsExporting(true);
    
    try {
      const JSZip = await loadZip();
      const zip = new JSZip();
      const dateStr = new Date().toISOString().split('T')[0];
      
      // Add README
      const readmeContent = generateReadmeContent();
      zip.file('LISEZ-MOI-IKtracker.txt', readmeContent);
      
      // Add CSV
      const csvContent = generateCSVContent();
      zip.file(`releve-ik-${dateStr}.csv`, csvContent);
      
      // Add HTML file (can be opened in browser and printed as PDF)
      const htmlContent = generateHTMLContent();
      zip.file(`releve-ik-${dateStr}.html`, htmlContent);
      
      // Generate ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `releve-ik-${dateStr}.zip`;
      link.click();
      
      toast.success("Export réussi", {
        description: "Le fichier ZIP contient le CSV et le relevé HTML",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExporting(false);
    }
  };

  const sendToAccountant = async () => {
    if (trips.length === 0) {
      toast.error("Aucun trajet à exporter");
      return;
    }

    setIsExporting(true);
    
    try {
      const JSZip = await loadZip();
      const zip = new JSZip();
      const dateStr = new Date().toISOString().split('T')[0];
      
      // Add README
      const readmeContent = generateReadmeContent();
      zip.file('LISEZ-MOI-IKtracker.txt', readmeContent);
      
      // Add CSV
      const csvContent = generateCSVContent();
      zip.file(`releve-ik-${dateStr}.csv`, csvContent);
      
      // Add HTML file (can be opened in browser and printed as PDF)
      const htmlContent = generateHTMLContent();
      zip.file(`releve-ik-${dateStr}.html`, htmlContent);
      
      // Generate ZIP and download
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `releve-ik-${dateStr}.zip`;
      link.click();

      // Get user identity for signature
      const vehicle = vehicles.length > 0 ? vehicles[0] : null;
      const ownerName = vehicle && (vehicle.ownerFirstName || vehicle.ownerLastName) 
        ? `${vehicle.ownerFirstName || ''} ${vehicle.ownerLastName || ''}`.trim()
        : user?.email?.split('@')[0] || 'Votre client';

      // Compose email
      const currentMonth = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const subject = encodeURIComponent(`Relevé des indemnités kilométriques - ${currentMonth}`);
      const body = encodeURIComponent(
`Bonjour,

Veuillez trouver ci-joint mon relevé des indemnités kilométriques pour la période en cours.

Ce relevé comprend :
- Le détail de mes ${trips.length} trajets professionnels
- Le total des kilomètres parcourus : ${totalKm.toFixed(0)} km
- Le montant total des indemnités : ${recalculatedTotalIK.toFixed(2)} €

Le fichier ZIP contient un PDF récapitulatif ainsi qu'un fichier CSV pour import dans votre logiciel comptable.

Je reste à votre disposition pour toute question.

Cordialement,
${ownerName}

---
Document généré via IKtracker
${IKTRACKER_URL}`
      );

      // Open mailto after a short delay to ensure download started
      setTimeout(() => {
        const mailto = preferences.accountantEmail 
          ? `mailto:${encodeURIComponent(preferences.accountantEmail)}?subject=${subject}&body=${body}`
          : `mailto:?subject=${subject}&body=${body}`;
        window.location.href = mailto;
      }, 500);

      // Mark that we've sent to accountant
      if (preferences.accountantEmail) {
        updatePreference('hasSentToAccountant', true);
        setIsEditingAccountantEmail(false);
      }

      toast.success("Fichier téléchargé", {
        description: "Joignez-le à l'email qui va s'ouvrir",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Relevé des trajets | IKtracker - Suivi kilométrique</title>
        <meta name="description" content="Consultez et exportez vos trajets professionnels. Calcul automatique des indemnités kilométriques selon le barème fiscal 2025." />
        <link rel="canonical" href="https://iktracker.fr/report" />
      </Helmet>
      
      {/* Desktop Sidebar - hidden on mobile */}
      {!isMobile && (
        <DesktopSidebar 
          vehicles={vehicles}
          onAddVehicle={addVehicle}
          onEditVehicle={updateVehicle}
          onDeleteVehicle={deleteVehicle}
          totalKm={totalKm}
        />
      )}

      <div className="min-h-screen bg-background pb-28 cursor-default md:pl-16">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2 md:py-4">
          <div className="flex items-center justify-between max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto">
            <Link to="/app">
              <Button variant="ghost" size="icon" aria-label="Retour à l'accueil">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">Relevé des trajets</h1>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={exportZip} onMouseEnter={() => { preloadZip(); }} disabled={trips.length === 0 || isExporting} aria-label="Télécharger les trajets">
                <Download className={`w-5 h-5 ${isExporting ? 'animate-bounce' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} aria-label="Accéder au profil">
                <UserCircle className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-3 md:py-6 space-y-3 md:space-y-4">
        <div className="bg-card rounded-md p-3 md:p-4 shadow-md space-y-2 md:space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Récapitulatif</h2>
          <div className="grid grid-cols-3 gap-3 md:gap-4 text-center">
            <div>
              <p className="text-xl md:text-2xl font-urbanist font-extrabold tabular-nums tracking-tight">{trips.length}</p>
              <p className="text-xs font-urbanist font-semibold text-muted-foreground">trajets</p>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-urbanist font-extrabold tabular-nums tracking-tight">{totalKm.toFixed(0)}</p>
              <p className="text-xs font-urbanist font-semibold text-muted-foreground">km</p>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-urbanist font-extrabold tabular-nums tracking-tight text-accent">{recalculatedTotalIK.toFixed(0)}€</p>
              <p className="text-xs font-urbanist font-semibold text-muted-foreground">IK</p>
            </div>
          </div>
          
          {/* Threshold Alert - Report variant (orange) */}
          {vehicles.length > 0 && (
            <ThresholdAlert 
              totalKm={totalKm} 
              fiscalPower={vehicles[0].fiscalPower} 
              variant="report" 
            />
          )}
          
          {/* Alert for trips with 0km */}
          {hasZeroKmTrips && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mt-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-warning-foreground">
                    {tripsWithZeroKm.length} trajet{tripsWithZeroKm.length > 1 ? 's' : ''} à 0 km
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {hasHomeAddress 
                      ? "Les distances peuvent être recalculées automatiquement" 
                      : "Configurez votre adresse de domicile pour recalculer"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={hasHomeAddress ? "default" : "outline"}
                  onClick={hasHomeAddress ? handleRecalculateDistances : () => navigate('/profile#mes-adresses')}
                  disabled={isRecalculating}
                  className="shrink-0"
                >
                  {isRecalculating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : hasHomeAddress ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Recalculer
                    </>
                  ) : (
                    <>
                      <Home className="w-4 h-4 mr-1" />
                      Configurer
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 flex flex-col items-center -my-1">
          {/* Show email input only if not sent yet - hidden on mobile */}
          {!isMobile && (!preferences.hasSentToAccountant || !preferences.accountantEmail) && (
            <div className="flex items-center gap-2 w-full">
              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Input
                type="email"
                placeholder="Email de votre comptable"
                value={preferences.accountantEmail}
                onChange={(e) => updatePreference('accountantEmail', e.target.value)}
                className="flex-1"
              />
            </div>
          )}
          <Button 
            variant="outline" 
            size="lg" 
            className="max-w-sm w-full bg-white dark:bg-muted text-primary dark:text-white hover:bg-white/90 dark:hover:bg-muted/80 border-0 dark:border dark:border-white/20 shadow-md"
            onClick={sendToAccountant} 
            disabled={trips.length === 0 || isExporting}
          >
            <Send className={`w-5 h-5 ${isExporting ? 'animate-bounce' : ''}`} />
            Envoyer le relevé à mon comptable
          </Button>
        </div>

        {/* Past Tours Dropdown */}
        <div className="bg-card rounded-md shadow-md overflow-hidden">
          <button
            onClick={() => {
              const willClose = showToursDropdown;
              setShowToursDropdown(!showToursDropdown);
              // Reset selected tour when closing the dropdown
              if (willClose) {
                setSelectedTourId(null);
              }
            }}
            className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Car className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium">Tournées passées</p>
                <p className="text-sm text-muted-foreground">
                  {pastTours.length} tournée{pastTours.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showToursDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          <div className={`grid transition-all duration-300 ease-out ${showToursDropdown ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <div className="border-t border-border p-3 space-y-2 max-h-60 overflow-y-auto">
                {pastTours.length > 0 ? (
                  pastTours.map(tour => (
                    <button
                      key={tour.id}
                      onClick={() => setSelectedTourId(selectedTourId === tour.id ? null : tour.id)}
                      className={`w-full p-3 rounded-md text-left transition-colors ${
                        selectedTourId === tour.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{tour.tourStops?.length || 0} arrêts</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">{formatTourDate(tour.startTime)}</span>
                        </div>
                        <span className="text-sm font-medium text-accent">{tour.ikAmount.toFixed(2)}€</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Car className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucune tournée enregistrée</p>
                    <p className="text-xs mt-1">Démarrez une tournée depuis l'accueil</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Selected Tour Details */}
        {selectedTour && selectedTour.tourStops && (
          <div className="bg-card rounded-md p-4 shadow-md animate-fade-in">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Détail de la tournée du {formatTourDate(selectedTour.startTime)}
            </h3>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-border" />
              
              <div className="space-y-3">
                {selectedTour.tourStops.map((stop, index) => (
                  <div key={stop.id} className="relative flex gap-3 items-start">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 shrink-0 ${
                      index === 0 
                        ? 'bg-primary text-primary-foreground' 
                        : index === selectedTour.tourStops!.length - 1
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }`}>
                      <MapPin className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0 pb-2">
                      <p className="font-medium text-sm truncate">{stop.city || (stop.address ? removeCountryFromAddress(stop.address) : 'Position')}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(stop.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">{selectedTour.distance.toFixed(1)} km • {selectedTour.ikAmount.toFixed(2)}€</span>
            </div>
          </div>
        )}


        {Object.keys(groupedByMonth).length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Aucun trajet enregistré</p>
          </div>
        ) : (
          <>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Trajets passés</h3>
            {Object.entries(groupedByMonth).map(([month, monthTrips], index) => (
            <div key={month}>
              {index > 0 && (
                <h3 className="text-sm font-medium text-muted-foreground mb-3 mt-6 capitalize">{month}</h3>
              )}
              <div className="space-y-3">
                {monthTrips.map(trip => {
                  const vehicle = getVehicle(trip.vehicleId);
                  return (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      vehicle={vehicle}
                      showTripTime={preferences.showTripTime}
                      onEdit={(t) => {
                        setEditingTrip(t);
                        setShowNewTrip(true);
                      }}
                      onDelete={deleteTrip}
                      showDelete
                      savedLocations={savedLocations}
                      onTripUpdated={() => window.location.reload()}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          </>
        )}

        {/* Archived trips section - above barème */}
        <Suspense fallback={<SheetLoader />}>
          <ArchivedTripsSection
            archivedTrips={archivedTrips}
            vehicles={vehicles}
            onRestore={restoreTrip}
            onPermanentDelete={permanentlyDeleteTrip}
          />
        </Suspense>

        <div className="bg-card rounded-md shadow-md overflow-hidden">
          <button
            onClick={() => setShowBaremeDropdown(!showBaremeDropdown)}
            className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Calculator className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium">Barème IK 2025</p>
                <p className="text-sm text-muted-foreground">Indemnités kilométriques</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showBaremeDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          <div className={`grid transition-all duration-300 ease-out ${showBaremeDropdown ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <div className="border-t border-border p-4">
                <div className="text-xs text-muted-foreground space-y-1">
                  {IK_BAREME_2024.map(b => (
                    <div key={b.cv} className="flex justify-between">
                      <span>{b.cv === '7+' ? '7 CV et +' : `${b.cv} CV`}</span>
                      <span>{b.upTo5000.rate} €/km (≤5000km)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom action buttons */}
      <div className="fixed bottom-0 left-0 right-0 py-3 px-4 bg-background/95 backdrop-blur-sm shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.08)]">
        <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto flex justify-center gap-3">
          <Link to="/profile#mes-adresses">
            <Button 
              variant="outline" 
              size="lg"
            >
              <Home className="w-5 h-5" />
              Mes adresses
            </Button>
          </Link>
          <Button 
            variant="gradient" 
            size="lg"
            onClick={() => setShowNewTrip(true)}
            disabled={vehicles.length === 0}
          >
            <Plus className="w-5 h-5" />
            Nouveau trajet
          </Button>
        </div>
      </div>

      {/* New trip sheet */}
      <Suspense fallback={null}>
        <NewTripSheet
          open={showNewTrip}
          onOpenChange={(open) => {
            setShowNewTrip(open);
            if (!open) setEditingTrip(null);
          }}
          savedLocations={savedLocations}
          vehicles={vehicles}
          editTrip={editingTrip}
          onAddLocation={addLocation}
          onDeleteLocation={deleteLocation}
          onUpdateLocation={updateLocation}
          onAddVehicle={handleAddVehicle}
          onCreateTrip={addTrip}
          onUpdateTrip={updateTrip}
          getTotalAnnualKm={getTotalAnnualKm}
        />
      </Suspense>

      {/* Vehicle form */}
      <Suspense fallback={null}>
        <VehicleForm
          open={showVehicleForm}
          onOpenChange={setShowVehicleForm}
          editVehicle={editingVehicle ? vehicles.find(v => v.id === editingVehicle) : undefined}
          onSave={(vehicleData) => {
            if (editingVehicle) {
              updateVehicle(editingVehicle, vehicleData);
            } else {
              addVehicle(vehicleData);
            }
          }}
        />
      </Suspense>
      </div>
    </>
  );
}
