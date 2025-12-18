import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTrips } from '@/hooks/useTrips';
import { Trip, Vehicle, getIKBareme, IK_BAREME_2024, calculateTotalAnnualIK } from '@/types/trip';
import { TripCard } from '@/components/TripCard';
import { NewTripSheet } from '@/components/NewTripSheet';
import { VehicleForm } from '@/components/VehicleForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Calendar, Download, Plus, Home, UserCircle, Mail, Pencil, Send, Car, ChevronDown, MapPin, Clock, Calculator } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePreferences } from '@/hooks/usePreferences';
import { toast } from '@/components/ui/sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';

export default function Report() {
  const navigate = useNavigate();
  const { trips, vehicles, savedLocations, deleteTrip, updateTrip, addTrip, addLocation, updateLocation, deleteLocation, addVehicle, updateVehicle, getTotalAnnualKm } = useTrips();
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
  
  const totalKm = trips.reduce((sum, t) => sum + t.distance, 0);
  const totalIK = trips.reduce((sum, t) => sum + t.ikAmount, 0);

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
      const vehicle = getVehicle(t.vehicleId);

      return [
        new Date(t.startTime).toLocaleDateString('fr-FR'),
        vehicle ? `${vehicle.ownerFirstName} ${vehicle.ownerLastName}` : '',
        vehicle ? `${vehicle.make} ${vehicle.model}` : '',
        vehicle?.licensePlate || '',
        vehicle?.fiscalPower?.toString() || '',
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

    const csv = [
      // Header mention
      IKTRACKER_MENTION,
      '',
      headers.join(';'),
      ...rows.map(r => r.join(';')),
    ].join('\n');

    return '\uFEFF' + csv; // BOM for Excel
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
    const sortedTrips = [...recalculatedTrips].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    const tableData = sortedTrips.map(t => {
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
      
      // Add README
      const readmeContent = generateReadmeContent();
      zip.file('LISEZ-MOI-IKtracker.txt', readmeContent);
      
      // Add CSV
      const csvContent = generateCSVContent();
      zip.file(`releve-ik-${dateStr}.csv`, csvContent);
      
      // Add PDF
      const pdfContent = await generatePDF();
      zip.file(`releve-ik-${dateStr}.pdf`, pdfContent);
      
      // Generate ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `releve-ik-${dateStr}.zip`;
      link.click();
      
      toast.success("Export réussi", {
        description: "Le fichier ZIP contient le CSV et le PDF",
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
      const zip = new JSZip();
      const dateStr = new Date().toISOString().split('T')[0];
      
      // Add README
      const readmeContent = generateReadmeContent();
      zip.file('LISEZ-MOI-IKtracker.txt', readmeContent);
      
      // Add CSV
      const csvContent = generateCSVContent();
      zip.file(`releve-ik-${dateStr}.csv`, csvContent);
      
      // Add PDF
      const pdfContent = await generatePDF();
      zip.file(`releve-ik-${dateStr}.pdf`, pdfContent);
      
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
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Link to="/app">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Relevé des trajets</h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={exportZip} disabled={trips.length === 0 || isExporting}>
              <Download className={`w-5 h-5 ${isExporting ? 'animate-bounce' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
              <UserCircle className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="bg-card rounded-md p-4 shadow-md">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Récapitulatif</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="counter-text text-2xl font-bold">{trips.length}</p>
              <p className="text-xs text-muted-foreground">trajets</p>
            </div>
            <div>
              <p className="counter-text text-2xl font-bold">{totalKm.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">km</p>
            </div>
            <div>
              <p className="counter-text text-2xl font-bold text-accent">{recalculatedTotalIK.toFixed(0)}€</p>
              <p className="text-xs text-muted-foreground">IK</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 flex flex-col items-center">
          {/* Show email input only if not sent yet */}
          {(!preferences.hasSentToAccountant || !preferences.accountantEmail) && (
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
            className="max-w-sm w-full bg-white dark:bg-white text-primary hover:bg-white/90 dark:hover:bg-white/90 border-0 shadow-md"
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
            onClick={() => setShowToursDropdown(!showToursDropdown)}
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
                      <p className="font-medium text-sm truncate">{stop.city || stop.address || 'Position'}</p>
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
          Object.entries(groupedByMonth).map(([month, monthTrips]) => (
            <div key={month}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 capitalize">{month}</h3>
              <div className="space-y-3">
                {monthTrips.map(trip => {
                  const vehicle = getVehicle(trip.vehicleId);
                  return (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      vehicle={vehicle}
                      onEdit={(t) => {
                        setEditingTrip(t);
                        setShowNewTrip(true);
                      }}
                      onDelete={deleteTrip}
                      showDelete
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}

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
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="max-w-lg mx-auto grid grid-cols-2 gap-3">
          <Link to="/app">
            <Button variant="outline" size="lg" className="w-full bg-white dark:bg-white text-primary hover:bg-white/90 dark:hover:bg-white/90 border-0 shadow-md">
              <Home className="w-5 h-5" />
              Accueil
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
    </div>
  );
}
