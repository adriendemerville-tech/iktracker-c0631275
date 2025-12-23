import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTrips } from '@/hooks/useTrips';
import { useTourTracker, TourStop } from '@/hooks/useTourTracker';
import { usePreferences } from '@/hooks/usePreferences';
import { useFeedback } from '@/hooks/useFeedback';
import { useAdmin } from '@/hooks/useAdmin';
import { useGeolocationPermission } from '@/hooks/useGeolocationPermission';
import { calculateDrivingDistance } from '@/hooks/useGeolocation';
import { reverseGeocode } from '@/lib/geocoding';
import { IK_BAREME_2024, calculateTotalAnnualIK, getIKBareme } from '@/types/trip';
import { Counter } from '@/components/Counter';
import { TripCard } from '@/components/TripCard';
import { VehicleCard } from '@/components/VehicleCard';
import { NewTripSheet } from '@/components/NewTripSheet';
import { VehicleForm } from '@/components/VehicleForm';
import { TourButton } from '@/components/TourButton';
import { TourLogSheet } from '@/components/TourLogSheet';
import { FocusTourView } from '@/components/FocusTourView';
import { GeolocationBanner } from '@/components/GeolocationBanner';
import { GeolocationTutorialModal } from '@/components/GeolocationTutorialModal';
import { ThresholdAlert } from '@/components/ThresholdAlert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InstallBanner } from '@/components/InstallBanner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileText, Plus, Car, MapPin, ChevronRight, UserCircle, Download, Shield, MessageSquareMore, BarChart3, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { ArchivedTripsSection } from '@/components/ArchivedTripsSection';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { OnboardingTutorial, useTutorial } from '@/components/OnboardingTutorial';
import { toast } from '@/components/ui/sonner';
import { loadPDFLibraries, loadZip } from '@/lib/pdf-utils';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const navigate = useNavigate();
  const { preferences } = usePreferences();
  const { unreadResponsesCount } = useFeedback();
  const { isAdmin } = useAdmin();
  const {
    showBanner: showGeoBanner,
    showTutorialModal,
    isGpsDisabled,
    isLoading: geoPermissionLoading,
    requestPermission,
    dismissBanner,
    closeTutorialModal,
  } = useGeolocationPermission();
  
  // Fetch pending feedbacks count for admins
  const { data: pendingFeedbacksCount = 0 } = useQuery({
    queryKey: ['pending-feedbacks-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback')
        .select('id', { count: 'exact' })
        .is('response', null);
      
      if (error) return 0;
      return data?.length || 0;
    },
    enabled: isAdmin,
  });
  const { 
    trips, 
    archivedTrips,
    savedLocations, 
    vehicles,
    totalKm, 
    totalIK, 
    getTotalAnnualKm,
    addTrip,
    deleteTrip,
    restoreTrip,
    permanentlyDeleteTrip,
    addLocation,
    updateLocation,
    deleteLocation,
    addVehicle,
    updateVehicle,
    deleteVehicle,
  } = useTrips();
  
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showTourLog, setShowTourLog] = useState(false);
  const [showTourHistory, setShowTourHistory] = useState(false);
  const [showTourMobileOnly, setShowTourMobileOnly] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);
  const [lastTour, setLastTour] = useState<TourStop[] | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const isMobile = useIsMobile();
  const { showTutorial, completeTutorial, startTutorial } = useTutorial();
  
  const {
    isActive: isTourActive,
    isLoading: isTourLoading,
    stops: tourStops,
    totalDistanceKm,
    currentPosition,
    wakeLockActive,
    lowBattery,
    startTour,
    stopTour,
    clearTour,
  } = useTourTracker({
    stopDurationThreshold: preferences.stopDetectionMinutes * 60,
    locationRadius: preferences.locationRadiusMeters,
    trackingInterval: 30000, // Check every 30 seconds
  });

  // Check for saved trip on reconnection
  useEffect(() => {
    const lastTripSaved = localStorage.getItem('iktracker_last_trip_saved');
    if (lastTripSaved) {
      try {
        const tripInfo = JSON.parse(lastTripSaved);
        // Only show notification if saved within the last 24 hours
        const savedAt = new Date(tripInfo.savedAt);
        const hoursAgo = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursAgo < 24) {
          toast.success("Dernier trajet enregistré", {
            description: `${tripInfo.distance.toFixed(1)} km${tripInfo.isTour ? ` - ${tripInfo.stopsCount} étapes` : ''}`,
            duration: 5000,
          });
        }
        // Clear after showing
        localStorage.removeItem('iktracker_last_trip_saved');
      } catch (e) {
        localStorage.removeItem('iktracker_last_trip_saved');
      }
    }
  }, []);

  const handleTourButtonClick = () => {
    if (isTourActive) {
      setShowTourLog(true);
      return;
    }

    if (tourStops.length > 0) {
      setShowTourLog(true);
      return;
    }

    // Desktop: show info modal (no tour starts)
    if (!isMobile) {
      setShowTourMobileOnly(true);
      return;
    }

    // Mobile: start the tour
    startTour();
    toast.success("Tournée démarrée", {
      description: "Les arrêts seront détectés automatiquement",
    });
  };

  const handleFinishTour = async () => {
    // Save the tour/trip based on number of stops
    if (tourStops.length >= 1) {
      await handleConvertToTrips(tourStops);
    } else {
      toast.error("Aucune étape détectée", {
        description: "Impossible d'enregistrer le trajet",
      });
      // Close sheet first, wait for it to fully disappear, then stop tour
      setShowTourLog(false);
      setTimeout(() => {
        stopTour();
        clearTour();
        // Show green "enregistré" notification for 4 seconds
        toast.success("Enregistré", { duration: 4000 });
      }, 800);
    }
  };

  const handleConvertToTrips = async (stops: TourStop[]) => {
    console.log('handleConvertToTrips called with stops:', stops);
    console.log('vehicles:', vehicles);
    
    if (stops.length < 1) {
      toast.error("Impossible de créer le trajet", {
        description: "Aucune étape détectée",
      });
      return;
    }
    
    if (vehicles.length === 0) {
      toast.error("Impossible de créer le trajet", {
        description: "Ajoutez d'abord un véhicule",
      });
      return;
    }

    

    const firstStop = stops[0];
    const vehicleId = vehicles[0].id;
    const isTour = stops.length >= 2;
    
    let totalDistance = 0;
    let endLocation: { lat: number; lng: number; address?: string; city?: string };

    if (isTour) {
      // Multiple stops: calculate total distance between all consecutive stops
      for (let i = 0; i < stops.length - 1; i++) {
        const start = stops[i];
        const end = stops[i + 1];
        try {
          const distance = await calculateDrivingDistance(
            start.lat,
            start.lng,
            end.lat,
            end.lng
          );
          totalDistance += distance;
        } catch (e) {
          console.warn('Failed to calculate distance segment:', e);
        }
      }
      const lastStop = stops[stops.length - 1];
      endLocation = {
        lat: lastStop.lat,
        lng: lastStop.lng,
        address: lastStop.address,
        city: lastStop.city,
      };
    } else {
      // Single stop: use current position as end point or use tracked distance
      if (currentPosition) {
        try {
          totalDistance = await calculateDrivingDistance(
            firstStop.lat,
            firstStop.lng,
            currentPosition.lat,
            currentPosition.lng
          );
          // Get address for current position
          const geocodeResult = await reverseGeocode(currentPosition.lat, currentPosition.lng);
          endLocation = {
            lat: currentPosition.lat,
            lng: currentPosition.lng,
            address: geocodeResult?.fullAddress,
            city: geocodeResult?.city,
          };
        } catch (e) {
          console.warn('Failed to calculate distance:', e);
          // Fallback to tracked distance
          totalDistance = totalDistanceKm;
          endLocation = {
            lat: currentPosition.lat,
            lng: currentPosition.lng,
          };
        }
      } else {
        // No current position available, use tracked distance and same location
        totalDistance = totalDistanceKm || 0;
        endLocation = {
          lat: firstStop.lat,
          lng: firstStop.lng,
          address: firstStop.address,
          city: firstStop.city,
        };
      }
    }

    console.log(`Total distance: ${totalDistance} km, isTour: ${isTour}`);

    // Filter: don't save if below minimum distance
    if (preferences.minDistanceKm > 0 && totalDistance < preferences.minDistanceKm) {
      toast.info("Trajet non enregistré", {
        description: `Distance inférieure à ${preferences.minDistanceKm} km`,
      });
      clearTour();
      setShowTourLog(false);
      return;
    }

    // Convert TourStop[] to TourStopData[] for storage (only for tours)
    const tourStopsData = isTour ? stops.map(stop => ({
      id: stop.id,
      timestamp: stop.timestamp.toISOString(),
      lat: stop.lat,
      lng: stop.lng,
      address: stop.address,
      city: stop.city,
      duration: stop.duration,
    })) : undefined;

    try {
      const result = await addTrip({
        vehicleId,
        startLocation: {
          id: firstStop.id,
          name: firstStop.city || firstStop.address || 'Position',
          address: firstStop.address || '',
          lat: firstStop.lat,
          lng: firstStop.lng,
          type: 'other',
        },
        endLocation: {
          id: crypto.randomUUID(),
          name: endLocation.city || endLocation.address || 'Position',
          address: endLocation.address || '',
          lat: endLocation.lat,
          lng: endLocation.lng,
          type: 'other',
        },
        distance: totalDistance,
        baseDistance: totalDistance,
        roundTrip: false,
        purpose: isTour ? 'Tournée' : 'Trajet',
        startTime: firstStop.timestamp,
        endTime: new Date(),
        tourStops: tourStopsData,
        status: 'validated',
      });
      
      console.log('Trip created:', result);
      
      if (result) {
        // Store last trip info in localStorage for reconnection notification
        localStorage.setItem('iktracker_last_trip_saved', JSON.stringify({
          distance: totalDistance,
          isTour,
          stopsCount: stops.length,
          savedAt: new Date().toISOString(),
        }));
        
        // Close sheet first, wait for it to fully disappear, then stop tour and show notification
        setShowTourLog(false);
        setTimeout(() => {
          stopTour();
          clearTour();
          // Show green "Enregistré" notification for 4 seconds
          toast.success("Enregistré", { duration: 4000 });
          // Clear the stored trip info since user saw the notification
          localStorage.removeItem('iktracker_last_trip_saved');
        }, 800);
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    } catch (e) {
      console.error('Failed to create trip:', e);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const recentTrips = trips.slice(0, 3);

  const handleAddVehicle = () => {
    setEditingVehicle(null);
    setShowVehicleForm(true);
  };

  const handleEditVehicle = (vehicleId: string) => {
    setEditingVehicle(vehicleId);
    setShowVehicleForm(true);
  };

  const getVehicle = (vehicleId: string) => vehicles.find(v => v.id === vehicleId);

  // Export functions
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
    // Calculate recalculated trips with cumulative km
    const grouped = new Map<string, typeof trips>();
    trips.forEach(trip => {
      const year = new Date(trip.startTime).getFullYear();
      const key = `${trip.vehicleId}-${year}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(trip);
    });

    const recalculatedTrips: (typeof trips[0] & { recalculatedIK: number; cumulativeKm: number; appliedRate: number })[] = [];

    grouped.forEach((vehicleTrips, key) => {
      const vehicleId = key.split('-')[0];
      const vehicle = getVehicle(vehicleId);
      const sorted = [...vehicleTrips].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      let cumulativeKm = 0;

      sorted.forEach(trip => {
        const prevCumulativeKm = cumulativeKm;
        cumulativeKm += trip.distance;

        if (!vehicle) {
          recalculatedTrips.push({ ...trip, recalculatedIK: trip.ikAmount, cumulativeKm, appliedRate: 0 });
          return;
        }

        const ikBefore = calculateTotalAnnualIK(prevCumulativeKm, vehicle.fiscalPower);
        const ikAfter = calculateTotalAnnualIK(cumulativeKm, vehicle.fiscalPower);
        const recalculatedIK = ikAfter - ikBefore;

        const bareme = getIKBareme(vehicle.fiscalPower);
        let appliedRate = bareme.upTo5000.rate;
        if (cumulativeKm > 20000) appliedRate = bareme.over20000.rate;
        else if (cumulativeKm > 5000) appliedRate = bareme.from5001To20000.rate;

        recalculatedTrips.push({ ...trip, recalculatedIK, cumulativeKm, appliedRate });
      });
    });

    const headers = [
      'Date', 'Propriétaire', 'Véhicule', 'Immatriculation', 'Puissance fiscale (CV)',
      'Lieu de départ', "Lieu d'arrivée", 'Distance (km)', 'Cumul annuel (km)',
      'Motif', 'Taux appliqué (€/km)', 'Montant IK (€)',
    ];

    const sortedTrips = [...recalculatedTrips].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const recalculatedTotalIK = recalculatedTrips.reduce((sum, t) => sum + t.recalculatedIK, 0);

    const rows = sortedTrips.map(t => {
      const vehicle = getVehicle(t.vehicleId);
      return [
        new Date(t.startTime).toLocaleDateString('fr-FR'),
        vehicle ? `${vehicle.ownerFirstName} ${vehicle.ownerLastName}` : '',
        vehicle ? `${vehicle.make} ${vehicle.model}` : '',
        vehicle?.licensePlate || '',
        vehicle?.fiscalPower?.toString() || '',
        t.startLocation.name, t.endLocation.name,
        t.distance.toFixed(1), t.cumulativeKm.toFixed(1), t.purpose,
        t.appliedRate.toFixed(3), t.recalculatedIK.toFixed(2),
      ];
    });

    rows.push([]);
    rows.push(['TOTAL', '', '', '', '', '', '', totalKm.toFixed(1), '', '', '', recalculatedTotalIK.toFixed(2)]);
    rows.push([]);
    rows.push(['Barème kilométrique fiscal 2024']);
    rows.push(['CV', "Jusqu'à 5000 km", '5001 à 20000 km', 'Au-delà de 20000 km']);
    IK_BAREME_2024.forEach(b => {
      rows.push([
        b.cv === '7+' ? '7 CV et plus' : `${b.cv} CV`,
        `d × ${b.upTo5000.rate}`,
        `(d × ${b.from5001To20000.rate}) + ${b.from5001To20000.fixed}`,
        `d × ${b.over20000.rate}`,
      ]);
    });
    rows.push([]);
    rows.push([IKTRACKER_MENTION]);
    rows.push([IKTRACKER_URL]);

    const csv = [IKTRACKER_MENTION, '', headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    return '\uFEFF' + csv;
  };

  const generatePDF = async () => {
    const { jsPDF, autoTable } = await loadPDFLibraries();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    
    // Date formatting
    const now = new Date();
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const currentMonth = monthNames[now.getMonth()];
    const currentYear = now.getFullYear();

    // Load logo (same as app/home)
    let logoBase64: string | null = null;
    try {
      const response = await fetch('/logo-iktracker-250.webp');
      const blob = await response.blob();
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('Could not load logo for PDF');
    }

    // Colors
    const primaryBlue = { r: 38, g: 97, b: 217 };
    const darkText = { r: 30, g: 41, b: 59 };
    const mutedText = { r: 100, g: 116, b: 139 };
    const lightGray = { r: 248, g: 250, b: 252 };
    const borderGray = { r: 226, g: 232, b: 240 };

    // Recalculate IK for proper cumulative calculation
    const grouped = new Map<string, typeof trips>();
    trips.forEach(trip => {
      const year = new Date(trip.startTime).getFullYear();
      const key = `${trip.vehicleId}-${year}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(trip);
    });

    const recalculatedTrips: (typeof trips[0] & { recalculatedIK: number })[] = [];
    grouped.forEach((vehicleTrips, key) => {
      const vehicleId = key.split('-')[0];
      const vehicle = getVehicle(vehicleId);
      const sorted = [...vehicleTrips].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      let cumulativeKm = 0;
      sorted.forEach(trip => {
        const prevCumulativeKm = cumulativeKm;
        cumulativeKm += trip.distance;
        if (!vehicle) {
          recalculatedTrips.push({ ...trip, recalculatedIK: trip.ikAmount });
          return;
        }
        const ikBefore = calculateTotalAnnualIK(prevCumulativeKm, vehicle.fiscalPower);
        const ikAfter = calculateTotalAnnualIK(cumulativeKm, vehicle.fiscalPower);
        recalculatedTrips.push({ ...trip, recalculatedIK: ikAfter - ikBefore });
      });
    });

    const recalculatedTotalIK = recalculatedTrips.reduce((sum, t) => sum + t.recalculatedIK, 0);
    const sortedTrips = [...recalculatedTrips].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    // === HEADER SECTION ===
    // Dark header band
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 6, 'F');

    let currentY = 14;

    // Header row with logo, title and stats
    // Logo
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', margin, currentY - 2, 12, 12);
    }
    
    // Title and subtitle
    doc.setTextColor(darkText.r, darkText.g, darkText.b);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Relevé IK', margin + 16, currentY + 3);
    doc.setFontSize(9);
    doc.setTextColor(mutedText.r, mutedText.g, mutedText.b);
    doc.setFont('helvetica', 'normal');
    doc.text(`${currentMonth} ${currentYear}`, margin + 16, currentY + 8);

    // Stats on right side
    const statsX = pageWidth - margin - 120;
    
    // Distance card
    doc.setFillColor(lightGray.r, lightGray.g, lightGray.b);
    doc.roundedRect(statsX, currentY - 4, 55, 16, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(mutedText.r, mutedText.g, mutedText.b);
    doc.text('Distance totale', statsX + 4, currentY);
    doc.setFontSize(12);
    doc.setTextColor(darkText.r, darkText.g, darkText.b);
    doc.setFont('helvetica', 'bold');
    doc.text(`${totalKm.toLocaleString('fr-FR')} km`, statsX + 4, currentY + 8);
    
    // Indemnités card
    doc.setFillColor(lightGray.r, lightGray.g, lightGray.b);
    doc.roundedRect(statsX + 60, currentY - 4, 55, 16, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(mutedText.r, mutedText.g, mutedText.b);
    doc.setFont('helvetica', 'normal');
    doc.text('Indemnités', statsX + 64, currentY);
    doc.setFontSize(12);
    doc.setTextColor(primaryBlue.r, primaryBlue.g, primaryBlue.b);
    doc.setFont('helvetica', 'bold');
    doc.text(`${recalculatedTotalIK.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, statsX + 64, currentY + 8);

    currentY += 18;

    // === VEHICLE INFO ===
    const vehicle = vehicles.length > 0 ? vehicles[0] : null;
    if (vehicle) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(borderGray.r, borderGray.g, borderGray.b);
      doc.roundedRect(margin, currentY, contentWidth, 12, 2, 2, 'FD');
      
      const vehicleName = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || `Véhicule ${vehicle.fiscalPower} CV`;
      doc.setTextColor(darkText.r, darkText.g, darkText.b);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(vehicleName, margin + 6, currentY + 7);
      
      doc.setFontSize(8);
      doc.setTextColor(mutedText.r, mutedText.g, mutedText.b);
      doc.setFont('helvetica', 'normal');
      const vehicleDetails = `${vehicle.fiscalPower} CV${vehicle.licensePlate ? ' • ' + vehicle.licensePlate : ''}`;
      doc.text(vehicleDetails, margin + 60, currentY + 7);

      currentY += 16;
    }

    // === TRIPS TABLE ===
    // Create table data with address including postal code and city
    const tableData = sortedTrips.map(t => {
      const tripDate = new Date(t.startTime);
      const day = tripDate.getDate().toString().padStart(2, '0');
      const month = (tripDate.getMonth() + 1).toString().padStart(2, '0');
      
      // Format address: keep street, postal code and city
      const formatAddress = (str: string, max: number) => {
        // Split by comma and take relevant parts
        const parts = str.split(',').map(p => p.trim());
        let result = parts[0]; // Street name
        
        // Try to find postal code and city (usually in format "12345 City")
        for (let i = 1; i < parts.length; i++) {
          const part = parts[i];
          // Match French postal code pattern (5 digits followed by city name)
          const postalMatch = part.match(/(\d{5})\s+(.+)/);
          if (postalMatch) {
            result += `, ${postalMatch[1]} ${postalMatch[2]}`;
            break;
          }
          // If it looks like just a city or contains a postal code
          if (part.match(/^\d{5}/) || (part.length > 2 && !part.match(/france/i))) {
            result += `, ${part}`;
            break;
          }
        }
        
        return result.length > max ? result.substring(0, max - 1) + '…' : result;
      };
      
      const startAddr = formatAddress(t.startLocation.name, 45);
      const endAddr = formatAddress(t.endLocation.name, 45);
      
      // Purpose/motif
      const motif = t.purpose || '-';
      
      return [
        `${day}/${month}`,
        startAddr,
        endAddr,
        motif.length > 25 ? motif.substring(0, 24) + '…' : motif,
        `${Math.round(t.distance)} km`,
        `${t.recalculatedIK.toFixed(2)} €`,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Départ', 'Arrivée', 'Motif', 'Distance', 'IK']],
      body: tableData,
      styles: { 
        fontSize: 8, 
        cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
        textColor: [darkText.r, darkText.g, darkText.b],
        lineWidth: 0,
        overflow: 'ellipsize',
        font: 'helvetica',
      },
      headStyles: { 
        fillColor: [primaryBlue.r, primaryBlue.g, primaryBlue.b],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7,
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
      },
      alternateRowStyles: { 
        fillColor: [lightGray.r, lightGray.g, lightGray.b],
      },
      columnStyles: {
        0: { cellWidth: 18, halign: 'center' },
        1: { cellWidth: 75 },
        2: { cellWidth: 75 },
        3: { cellWidth: 50 },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [primaryBlue.r, primaryBlue.g, primaryBlue.b] },
      },
      margin: { left: margin, right: margin },
      tableLineColor: [borderGray.r, borderGray.g, borderGray.b],
      tableLineWidth: 0.1,
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // === TOTAL SECTION ===
    doc.setDrawColor(borderGray.r, borderGray.g, borderGray.b);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 6;
    
    doc.setFontSize(10);
    doc.setTextColor(darkText.r, darkText.g, darkText.b);
    doc.setFont('helvetica', 'normal');
    doc.text('Total à déclarer', margin, currentY);
    
    doc.setFontSize(14);
    doc.setTextColor(primaryBlue.r, primaryBlue.g, primaryBlue.b);
    doc.setFont('helvetica', 'bold');
    doc.text(`${recalculatedTotalIK.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, pageWidth - margin, currentY, { align: 'right' });

    // === PAGE 2: BARÈME FISCAL ===
    doc.addPage();
    
    // Dark header band (same as page 1)
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 6, 'F');

    let baremeY = 16;

    // Header with logo
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', margin, baremeY - 2, 10, 10);
    }
    
    doc.setTextColor(darkText.r, darkText.g, darkText.b);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Barème kilométrique fiscal 2025', margin + 14, baremeY + 4);

    baremeY += 16;

    // Explanation text
    doc.setFontSize(8);
    doc.setTextColor(mutedText.r, mutedText.g, mutedText.b);
    doc.setFont('helvetica', 'normal');
    const explanationText = "Le barème kilométrique permet de calculer les frais de déplacement professionnels déductibles. Le montant varie selon la puissance fiscale du véhicule et le nombre de kilomètres parcourus sur l'année.";
    const splitText = doc.splitTextToSize(explanationText, contentWidth);
    doc.text(splitText, margin, baremeY);
    
    baremeY += splitText.length * 4 + 8;

    // Barème table data
    const baremeTableData = IK_BAREME_2024.map(b => [
      b.cv === '7+' ? '7 CV et plus' : `${b.cv} CV`,
      `d × ${b.upTo5000.rate} €`,
      `(d × ${b.from5001To20000.rate}) + ${b.from5001To20000.fixed} €`,
      `d × ${b.over20000.rate} €`,
    ]);

    autoTable(doc, {
      startY: baremeY,
      head: [['Puissance fiscale', 'Jusqu\'à 5 000 km', 'De 5 001 à 20 000 km', 'Au-delà de 20 000 km']],
      body: baremeTableData,
      styles: { 
        fontSize: 9, 
        cellPadding: 5,
        textColor: [darkText.r, darkText.g, darkText.b],
      },
      headStyles: { 
        fillColor: [primaryBlue.r, primaryBlue.g, primaryBlue.b],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
      },
      alternateRowStyles: { 
        fillColor: [lightGray.r, lightGray.g, lightGray.b],
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { halign: 'center', cellWidth: 50 },
        2: { halign: 'center', cellWidth: 70 },
        3: { halign: 'center', cellWidth: 50 },
      },
      margin: { left: margin, right: margin },
    });

    baremeY = (doc as any).lastAutoTable.finalY + 10;

    // Legend
    doc.setFontSize(7);
    doc.setTextColor(mutedText.r, mutedText.g, mutedText.b);
    doc.setFont('helvetica', 'italic');
    doc.text('d = distance parcourue en kilomètres', margin, baremeY);

    baremeY += 8;

    // Electric vehicle bonus info
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(margin, baremeY, 200, 18, 2, 2, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(primaryBlue.r, primaryBlue.g, primaryBlue.b);
    doc.setFont('helvetica', 'bold');
    doc.text('⚡ Bonus véhicule électrique', margin + 6, baremeY + 6);
    
    doc.setFontSize(7);
    doc.setTextColor(mutedText.r, mutedText.g, mutedText.b);
    doc.setFont('helvetica', 'normal');
    doc.text('Les véhicules 100% électriques bénéficient d\'une majoration de 20% sur le montant des indemnités kilométriques.', margin + 6, baremeY + 12);

    baremeY += 24;

    // Source info
    doc.setFontSize(6);
    doc.setTextColor(mutedText.r, mutedText.g, mutedText.b);
    doc.text('Source : Arrêté du 27 mars 2024 fixant le barème forfaitaire permettant l\'évaluation des frais de déplacement relatifs à l\'utilisation d\'un véhicule.', margin, baremeY);

    // === FOOTER ON ALL PAGES ===
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Marketing tagline at bottom
      doc.setFontSize(7);
      doc.setTextColor(mutedText.r, mutedText.g, mutedText.b);
      doc.setFont('helvetica', 'normal');
      doc.text('Simplifiez votre suivi kilométrique avec IKtracker', margin, pageHeight - 12);
      
      // Footer line
      doc.setDrawColor(borderGray.r, borderGray.g, borderGray.b);
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);
      
      // Footer text
      doc.setFontSize(6);
      doc.text('Généré par IKtracker  •  iktracker.fr  •  Conforme au barème fiscal 2025', margin, pageHeight - 6);
      doc.text(`Page ${i}/${pageCount}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
    }

    return doc.output('arraybuffer');
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
      zip.file('LISEZ-MOI-IKtracker.txt', generateReadmeContent());
      zip.file(`releve-ik-${dateStr}.csv`, generateCSVContent());
      zip.file(`releve-ik-${dateStr}.pdf`, await generatePDF());

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `releve-ik-${dateStr}.zip`;
      link.click();

      toast.success("Export réussi", { description: "Le fichier ZIP contient le CSV et le PDF" });
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <AlertDialog open={showTourMobileOnly} onOpenChange={setShowTourMobileOnly}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-2">
              <Smartphone className="w-7 h-7 text-accent" />
            </div>
            <AlertDialogTitle className="text-accent text-xl">Réservé à l'usage mobile</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Ouvrez iktracker.fr sur le navigateur de votre smartphone et téléchargez l'app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* QR Code */}
          <div className="flex justify-center py-4">
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG 
                value="https://iktracker.fr/install" 
                size={140}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground -mt-2">
            Scannez ce QR code avec votre téléphone
          </p>
          
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel>Fermer</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Focus Tour View - Full screen immersive mode */}
      <FocusTourView
        isActive={isTourActive}
        totalDistanceKm={totalDistanceKm}
        detectedStopsCount={Math.max(0, tourStops.length - 1)}
        wakeLockActive={wakeLockActive}
        lowBattery={lowBattery}
        tourStartTime={tourStops[0]?.timestamp}
        onStop={() => setShowTourLog(true)}
      />

      {/* Desktop Sidebar - hidden on mobile */}
      <DesktopSidebar 
        vehicles={vehicles}
        onAddVehicle={addVehicle}
        onEditVehicle={updateVehicle}
        onDeleteVehicle={(vehicleId) => setVehicleToDelete(vehicleId)}
        onTourClick={handleTourButtonClick}
        isTourActive={isTourActive}
        onStartTutorial={startTutorial}
        totalKm={totalKm}
      />

      {/* Onboarding Tutorial - Desktop only */}
      {!isMobile && (
        <OnboardingTutorial 
          isVisible={showTutorial} 
          onComplete={completeTutorial} 
        />
      )}

      <div className="min-h-screen bg-background font-urbanist cursor-default select-none md:pl-16">
      {/* Header - Fintech Dark */}
      <header 
        className="text-white px-4 pt-4 pb-4 md:pt-8 md:pb-8 rounded-b-[2rem] relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)'
        }}
      >
        {/* Animated gradient - top left */}
        <div 
          className="absolute inset-0 pointer-events-none animate-[pulse-gradient_4s_ease-in-out_infinite]"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 10% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)'
          }}
        />
        {/* Animated gradient - bottom right */}
        <div 
          className="absolute inset-0 pointer-events-none animate-[pulse-gradient_4s_ease-in-out_infinite_1s]"
          style={{
            background: 'radial-gradient(ellipse 60% 40% at 90% 85%, rgba(59, 130, 246, 0.10) 0%, transparent 50%)'
          }}
        />
        {/* Noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
          }}
        />
        <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto relative z-10 px-4">
          <div className="flex items-center gap-3 mb-3 md:mb-6">
            {/* Desktop: Logo image like landing page */}
            <Link to="/" className="flex-1 hidden md:flex items-center gap-3 group transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer">
              <img 
                src="/logo-iktracker-250.webp" 
                alt="IKtracker"
                width={250}
                height={250}
                className="h-10 w-10 transition-transform duration-300 group-hover:scale-110 pointer-events-none" 
              />
              <div className="pointer-events-none select-none">
                <h1 className="text-xl sm:text-2xl md:text-[27px] font-extrabold font-urbanist text-white group-hover:text-primary transition-colors duration-300">IKtracker</h1>
                <p className="text-xs sm:text-sm text-white/60 font-urbanist group-hover:text-white/80 transition-colors duration-300">Indemnités Kilométriques</p>
              </div>
            </Link>
            {/* Mobile: Text only */}
            <h1 className="flex-1 md:hidden text-xl sm:text-2xl font-extrabold font-urbanist text-white">IKtracker</h1>
            {isAdmin && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/admin?tab=stats')}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                  title="Dashboard statistiques"
                >
                  <BarChart3 className="w-5 h-5" />
                </Button>
                <div className="relative">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => navigate('/admin')}
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <MessageSquareMore className="w-5 h-5" />
                  </Button>
                  {pendingFeedbacksCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full"
                    >
                      {pendingFeedbacksCount}
                    </Badge>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/admin?tab=users')}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Shield className="w-5 h-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={exportZip}
                  disabled={trips.length === 0 || isExporting}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                  data-tutorial="download"
                >
                  <Download className={`w-5 h-5 ${isExporting ? 'animate-bounce' : ''}`} />
                </Button>
              </>
            )}
            {!isAdmin && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={exportZip}
                disabled={trips.length === 0 || isExporting}
                className="text-white/70 hover:text-white hover:bg-white/10"
                data-tutorial="download"
              >
                <Download className={`w-5 h-5 ${isExporting ? 'animate-bounce' : ''}`} />
              </Button>
            )}
            <div className="relative" data-tutorial="profile">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/profile')}
                className="text-white/70 hover:text-white hover:bg-white/10 w-10 h-10"
              >
                <UserCircle className="w-20 h-20" />
              </Button>
              {unreadResponsesCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full"
                >
                  {unreadResponsesCount}
                </Badge>
              )}
            </div>
          </div>

          {/* KPI Cards - Glassmorphism */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Counter key={`km-${preferences.counterResetDate}`} value={totalKm} label="Distance totale" unit="km" />
            <Counter key={`ik-${preferences.counterResetDate}`} value={totalIK} label="Indemnités" unit="€" variant="accent" decimals={2} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-4 pt-3 space-y-3 md:space-y-5 pb-36">
        {/* Geolocation Banner */}
        {showGeoBanner && (
          <GeolocationBanner
            onActivate={requestPermission}
            onDismiss={dismissBanner}
            isLoading={geoPermissionLoading}
          />
        )}

        {/* Pending trips section - "À compléter" */}
        {trips.filter(t => t.status === 'pending_location').length > 0 && (
          <section 
            className="rounded-lg p-4 border border-[hsl(270,50%,35%)]/40 transition-all duration-300 hover:border-[hsl(270,50%,45%)]/60 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]" 
            style={{
              background: 'linear-gradient(135deg, hsl(270, 50%, 20%) 0%, hsl(280, 45%, 15%) 100%)'
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-purple-300" />
              <h2 className="text-lg font-semibold text-purple-100">À compléter</h2>
              <Badge className="ml-auto bg-purple-400/20 text-purple-200 border-purple-400/30 hover:bg-purple-400/30">
                {trips.filter(t => t.status === 'pending_location').length}
              </Badge>
            </div>
            <div className="space-y-3">
              {trips
                .filter(t => t.status === 'pending_location')
                .map((trip) => (
                  <TripCard 
                    key={trip.id} 
                    trip={trip} 
                    vehicle={getVehicle(trip.vehicleId)}
                    savedLocations={savedLocations}
                    showTripTime={preferences.showTripTime}
                    onTripUpdated={() => {
                      // Reload page to refresh trips after completion
                      window.location.reload();
                    }}
                  />
                ))}
            </div>
          </section>
        )}

        {/* Vehicles section */}
        <section>
          {/* Title hidden on mobile */}
          <div className="hidden md:flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Mes véhicules</h2>
            <Button variant="ghost" size="sm" onClick={handleAddVehicle}>
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
          </div>

          {vehicles.length === 0 ? (
            <div className="text-center py-8 bg-card rounded-md">
              <Car className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Aucun véhicule enregistré</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Ajoutez votre véhicule pour commencer
              </p>
              <Button onClick={handleAddVehicle} className="hidden md:inline-flex">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un véhicule
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicles.map(vehicle => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  totalKm={getTotalAnnualKm(vehicle.id)}
                  onEdit={() => handleEditVehicle(vehicle.id)}
                  onDelete={() => setVehicleToDelete(vehicle.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* PWA Install Banner */}
        <InstallBanner />

        {/* Recent trips */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-lg font-semibold">Derniers trajets</h2>
            {trips.length > 3 && (
              <Link to="/report" className="text-sm text-primary font-medium flex items-center">
                Voir tout
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {recentTrips.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-md">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Aucun trajet enregistré</p>
              <p className="text-sm text-muted-foreground mt-1">
                {vehicles.length === 0 
                  ? "Ajoutez d'abord un véhicule" 
                  : "Commencez par créer votre premier trajet"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTrips.filter(t => t.status !== 'pending_location').map((trip) => (
                <TripCard 
                  key={trip.id} 
                  trip={trip} 
                  vehicle={getVehicle(trip.vehicleId)}
                  showTripTime={preferences.showTripTime}
                />
              ))}
            </div>
          )}
          
          {/* Threshold Alert - Home variant (gray) */}
          {vehicles.length > 0 && (
            <ThresholdAlert 
              totalKm={totalKm} 
              fiscalPower={vehicles[0].fiscalPower} 
              variant="home" 
            />
          )}

          {/* Archived trips section */}
          <ArchivedTripsSection
            archivedTrips={archivedTrips}
            vehicles={vehicles}
            onRestore={restoreTrip}
            onPermanentDelete={permanentlyDeleteTrip}
          />
        </section>
      </main>

      {/* Tour button - floating above mobile nav (hidden on desktop, now in sidebar) */}
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-10 md:hidden">
        <TourButton
          isActive={isTourActive}
          isLoading={isTourLoading}
          totalDistanceKm={totalDistanceKm}
          stopsCount={tourStops.length}
          onClick={handleTourButtonClick}
        />
      </div>

      {/* Desktop: Bottom action buttons */}
      <div className="hidden md:block">
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-3">
          {/* Voir le relevé */}
          <Link to="/report" data-tutorial="report">
            <Button variant="outline" size="default" className="shadow-lg bg-card border-border">
              <FileText className="w-4 h-4" />
              Voir le relevé
            </Button>
          </Link>

          {/* Nouveau trajet */}
          <Button
            variant="gradient"
            size="default"
            className="shadow-lg shadow-primary/30"
            data-tutorial="add-trip"
            onClick={() => {
              if (vehicles.length === 0) {
                toast.info("Ajoutez d'abord un véhicule", {
                  description: "Un véhicule est nécessaire pour enregistrer les trajets",
                  action: {
                    label: "Ajouter",
                    onClick: handleAddVehicle,
                  },
                });
              } else {
                setShowNewTrip(true);
              }
            }}
            disabled={vehicles.length === 0}
          >
            <Plus className="w-4 h-4" />
            Nouveau trajet
          </Button>
        </div>
      </div>

      {/* Mobile: Bottom action buttons (unchanged) */}
      <div className="fixed bottom-0 left-0 right-0 py-3 px-4 bg-background/95 backdrop-blur-sm shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.08)] md:hidden">
        <div className="max-w-lg mx-auto grid grid-cols-2 gap-3">
          <Link to="/report">
            <Button variant="secondary" size="lg" className="w-full shadow-[0_4px_8px_-2px_rgba(0,0,0,0.15)] text-white dark:text-white">
              <FileText className="w-5 h-5" />
              Voir le relevé
            </Button>
          </Link>
          <Button 
            variant="gradient" 
            size="lg"
            className="animate-cta-pulse shadow-[0_4px_8px_-2px_rgba(0,0,0,0.2)]"
            onClick={() => {
              if (vehicles.length === 0) {
                toast.info("Ajoutez d'abord un véhicule", {
                  description: "Un véhicule est nécessaire pour enregistrer les trajets",
                  action: {
                    label: "Ajouter",
                    onClick: handleAddVehicle,
                  },
                });
              } else {
                setShowNewTrip(true);
              }
            }}
          >
            <Plus className="w-5 h-5" />
            Nouveau trajet
          </Button>
        </div>
      </div>

      {/* New trip sheet */}
      <NewTripSheet
        open={showNewTrip}
        onOpenChange={setShowNewTrip}
        savedLocations={savedLocations}
        vehicles={vehicles}
        onAddLocation={addLocation}
        onDeleteLocation={deleteLocation}
        onUpdateLocation={updateLocation}
        onAddVehicle={handleAddVehicle}
        onCreateTrip={addTrip}
        getTotalAnnualKm={getTotalAnnualKm}
      />

      {/* Vehicle form */}
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

      {/* Tour log sheet */}
      <TourLogSheet
        open={showTourLog}
        onOpenChange={setShowTourLog}
        isActive={isTourActive}
        isLoading={isTourLoading}
        stops={tourStops}
        totalDistanceKm={totalDistanceKm}
        wakeLockActive={wakeLockActive}
        lowBattery={lowBattery}
        onStart={startTour}
        onFinish={handleFinishTour}
        onClear={clearTour}
        hasHistory={!!lastTour}
        onShowHistory={() => {
          setShowTourLog(false);
          setShowTourHistory(true);
        }}
      />

      {/* Tour history sheet */}
      <TourLogSheet
        open={showTourHistory}
        onOpenChange={setShowTourHistory}
        isActive={false}
        isLoading={false}
        stops={lastTour || []}
        onStart={() => {}}
        onFinish={() => {}}
        onClear={() => setLastTour(null)}
        isHistory
      />

      {/* Delete vehicle confirmation */}
      <AlertDialog open={!!vehicleToDelete} onOpenChange={(open) => !open && setVehicleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce véhicule ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les trajets associés seront conservés avec leurs indemnités déjà calculées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (vehicleToDelete) {
                  const result = await deleteVehicle(vehicleToDelete);
                  setVehicleToDelete(null);
                  if (result.success) {
                    toast.success("Véhicule supprimé");
                  } else {
                    toast.error(result.error || "Impossible de supprimer ce véhicule");
                  }
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Geolocation Tutorial Modal */}
      <GeolocationTutorialModal
        open={showTutorialModal}
        onClose={closeTutorialModal}
        isGpsDisabled={isGpsDisabled}
      />
    </div>
    </>

  );
};

export default Index;
