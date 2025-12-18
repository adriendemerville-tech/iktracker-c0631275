import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTrips } from '@/hooks/useTrips';
import { useTourTracker, TourStop } from '@/hooks/useTourTracker';
import { usePreferences } from '@/hooks/usePreferences';
import { useFeedback } from '@/hooks/useFeedback';
import { useAdmin } from '@/hooks/useAdmin';
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
import { FileText, Plus, Car, MapPin, ChevronRight, UserCircle, Truck, Download, Shield, MessageSquareMore, BarChart3 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
const Index = () => {
  const navigate = useNavigate();
  const { preferences } = usePreferences();
  const { unreadResponsesCount } = useFeedback();
  const { isAdmin } = useAdmin();
  
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
    savedLocations, 
    vehicles,
    totalKm, 
    totalIK, 
    getTotalAnnualKm,
    addTrip, 
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
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);
  const [lastTour, setLastTour] = useState<TourStop[] | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const {
    isActive: isTourActive,
    isLoading: isTourLoading,
    stops: tourStops,
    totalDistanceKm,
    currentPosition,
    startTour,
    stopTour,
    clearTour,
  } = useTourTracker({
    stopDurationThreshold: preferences.stopDetectionMinutes * 60,
    locationRadius: preferences.locationRadiusMeters,
    trackingInterval: 30000, // Check every 30 seconds
  });

  const handleTourButtonClick = () => {
    if (isTourActive) {
      setShowTourLog(true);
    } else if (tourStops.length > 0) {
      setShowTourLog(true);
    } else {
      startTour();
      toast.success("Tournée démarrée", {
        description: "Les arrêts seront détectés automatiquement",
      });
    }
  };

  const handleFinishTour = async () => {
    // Stop tracking
    stopTour();
    
    // Save the tour/trip based on number of stops
    if (tourStops.length >= 1) {
      await handleConvertToTrips(tourStops);
    } else {
      toast.error("Aucune étape détectée", {
        description: "Impossible d'enregistrer le trajet",
      });
      clearTour();
      setShowTourLog(false);
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

    toast.info("Calcul de la distance...");

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
      });
      
      console.log('Trip created:', result);
      
      if (result) {
        const label = isTour ? 'Tournée' : 'Trajet';
        toast.success(`${label} enregistré`, {
          description: `${totalDistance.toFixed(1)} km${isTour ? ` - ${stops.length} étapes` : ''}`,
        });
        clearTour();
        setShowTourLog(false);
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
    const doc = new jsPDF({ orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 14;
    const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const generatedDate = new Date().toLocaleDateString('fr-FR');

    // Load logo
    let logoBase64: string | null = null;
    try {
      const response = await fetch('/favicon.png');
      const blob = await response.blob();
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('Could not load logo for PDF');
    }

    // Recalculate for PDF
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

    // === HEADER SECTION ===
    // Blue line at top
    doc.setFillColor(38, 97, 217);
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Add logo if available
    const logoSize = 12;
    const titleX = logoBase64 ? margin + logoSize + 4 : margin;
    
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', margin, 10, logoSize, logoSize);
    }

    // Title (adjusted position based on logo)
    doc.setFontSize(22);
    doc.setTextColor(38, 97, 217);
    doc.setFont('helvetica', 'bold');
    doc.text('Relevé IKtracker', titleX, 18);

    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(dateStr, titleX, 26);

    // Generated date (right aligned)
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`Généré le ${generatedDate}`, pageWidth - margin, 18, { align: 'right' });
    doc.text('Barème fiscal 2025', pageWidth - margin, 24, { align: 'right' });

    // === VEHICLE INFO BOX ===
    const vehicle = vehicles.length > 0 ? vehicles[0] : null;
    if (vehicle) {
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(margin, 35, pageWidth - 2 * margin, 22, 3, 3, 'F');
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Véhicule', margin + 8, 42);
      doc.text('Puissance fiscale', margin + 60, 42);
      doc.text('Immatriculation', margin + 110, 42);
      
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      const vehicleName = `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || `Véhicule ${vehicle.fiscalPower} CV`;
      doc.text(vehicleName, margin + 8, 50);
      doc.text(`${vehicle.fiscalPower} CV`, margin + 60, 50);
      doc.text(vehicle.licensePlate || '-', margin + 110, 50);
      
      if (vehicle.ownerFirstName || vehicle.ownerLastName) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('Propriétaire', margin + 155, 42);
        doc.setFontSize(10);
        doc.setTextColor(30, 30, 30);
        doc.text(`${vehicle.ownerFirstName || ''} ${vehicle.ownerLastName || ''}`.trim(), margin + 155, 50);
      }
    }

    // === TRIPS TABLE ===
    const sortedTrips = [...recalculatedTrips].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const tableData = sortedTrips.map(t => {
      const v = getVehicle(t.vehicleId);
      return [
        new Date(t.startTime).toLocaleDateString('fr-FR'),
        `${t.startLocation.name} → ${t.endLocation.name}`,
        `${t.distance.toFixed(1)} km`,
        `${t.recalculatedIK.toFixed(2)} €`,
      ];
    });

    autoTable(doc, {
      startY: vehicle ? 62 : 38,
      head: [['Date', 'Trajet', 'Distance', 'Indemnité']],
      body: tableData,
      styles: { 
        fontSize: 9, 
        cellPadding: 4,
        lineColor: [230, 230, 230],
        lineWidth: 0.1,
      },
      headStyles: { 
        fillColor: [248, 249, 250],
        textColor: [100, 100, 100],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        textColor: [30, 30, 30],
      },
      alternateRowStyles: { 
        fillColor: [255, 255, 255] 
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
      },
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // === TOTALS BOX ===
    const totalsBoxWidth = 70;
    const totalsBoxX = pageWidth - margin - totalsBoxWidth;
    
    // Light blue background for totals
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(totalsBoxX, currentY, totalsBoxWidth, 28, 3, 3, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Total du mois', totalsBoxX + totalsBoxWidth / 2, currentY + 8, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(38, 97, 217);
    doc.setFont('helvetica', 'bold');
    doc.text(`${totalKm.toFixed(0)} km • ${recalculatedTotalIK.toFixed(2)} €`, totalsBoxX + totalsBoxWidth / 2, currentY + 20, { align: 'center' });

    currentY += 40;

    // === BARÈME SECTION (if fits on page) ===
    if (currentY < pageHeight - 80) {
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.text('Barème kilométrique fiscal 2025', margin, currentY);
      
      const baremeData = IK_BAREME_2024.map(b => [
        b.cv === '7+' ? '7 CV et +' : `${b.cv} CV`,
        `${b.upTo5000.rate} €/km`,
        `${b.from5001To20000.rate} €/km + ${b.from5001To20000.fixed} €`,
        `${b.over20000.rate} €/km`,
      ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Puissance', '≤ 5 000 km', '5 001 - 20 000 km', '> 20 000 km']],
        body: baremeData,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [100, 116, 139], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 249, 250] },
      });
    }

    // === FOOTER ON ALL PAGES ===
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Footer line
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
      
      // Footer text
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'normal');
      doc.text('Document généré par IKtracker • iktracker.lovable.app • Conforme au barème fiscal 2025', pageWidth / 2, pageHeight - 12, { align: 'center' });
      doc.text(`Page ${i}/${pageCount}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
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
    <div className="min-h-screen bg-background font-urbanist">
      {/* Header - Fintech Dark */}
      <header 
        className="text-white px-4 pt-8 pb-8 rounded-b-[2rem] relative overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 10% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
            linear-gradient(180deg, #0F172A 0%, #1E293B 100%)
          `
        }}
      >
        {/* Noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
          }}
        />
        
        <div className="max-w-lg mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/20 backdrop-blur-sm border border-blue-400/30"
            >
              <Truck className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-[27px] font-extrabold font-urbanist text-white">Ik Tracker</h1>
              <p className="text-sm text-white/60 font-urbanist">Indemnités Kilométriques</p>
            </div>
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
              </>
            )}
            {!isAdmin && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={exportZip}
                disabled={trips.length === 0 || isExporting}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <Download className={`w-5 h-5 ${isExporting ? 'animate-bounce' : ''}`} />
              </Button>
            )}
            <div className="relative">
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
          <div className="grid grid-cols-2 gap-4">
            <Counter value={totalKm} label="Distance totale" unit="km" />
            <Counter value={totalIK} label="Indemnités" unit="€" variant="accent" decimals={2} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 pt-4 space-y-5 pb-32">
        {/* Vehicles section */}
        <section>
          <div className="flex items-center justify-between mb-4">
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
              <Button onClick={handleAddVehicle}>
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
            <h2 className="text-lg font-semibold">Derniers trajets</h2>
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
              {recentTrips.map((trip) => (
                <TripCard 
                  key={trip.id} 
                  trip={trip} 
                  vehicle={getVehicle(trip.vehicleId)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Tour button - floating above */}
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-10">
        <TourButton
          isActive={isTourActive}
          isLoading={isTourLoading}
          totalDistanceKm={totalDistanceKm}
          stopsCount={tourStops.length}
          onClick={handleTourButtonClick}
        />
      </div>

      {/* Bottom action buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="max-w-lg mx-auto grid grid-cols-2 gap-3">
          <Link to="/report">
            <Button variant="secondary" size="lg" className="w-full">
              <FileText className="w-5 h-5" />
              Voir le relevé
            </Button>
          </Link>
          <Button 
            variant="gradient" 
            size="lg" 
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
              Cette action est irréversible. Le véhicule sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (vehicleToDelete) {
                  deleteVehicle(vehicleToDelete);
                  setVehicleToDelete(null);
                  toast.success("Véhicule supprimé");
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
