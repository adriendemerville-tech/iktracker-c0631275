import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTrips } from '@/hooks/useTrips';
import { Trip, Vehicle, getIKBareme, IK_BAREME_2024, calculateTotalAnnualIK } from '@/types/trip';
import { TripCard } from '@/components/TripCard';
import { NewTripSheet } from '@/components/NewTripSheet';
import { VehicleForm } from '@/components/VehicleForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Download, Plus, Home, UserCircle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';

export default function Report() {
  const navigate = useNavigate();
  const { trips, vehicles, savedLocations, deleteTrip, updateTrip, addTrip, addLocation, updateLocation, deleteLocation, addVehicle, updateVehicle, getTotalAnnualKm } = useTrips();
  
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
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

  const generatePDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const dateStr = new Date().toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    
    // Main title with logo blue color (#2661D9 = RGB 38, 97, 217)
    doc.setFontSize(24);
    doc.setTextColor(38, 97, 217);
    doc.setFont('helvetica', 'bold');
    doc.text(`Relevé IKtracker au ${dateStr}`, 14, 20);
    
    // Summary line
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total: ${trips.length} trajets | ${totalKm.toFixed(1)} km | ${recalculatedTotalIK.toFixed(2)} €`, 14, 30);

    // Sort chronologically
    const sortedTrips = [...recalculatedTrips].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    // Create table data - all trips line by line
    const tableData = sortedTrips.map(t => {
      const vehicle = getVehicle(t.vehicleId);
      const vehicleName = vehicle ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || `${vehicle.fiscalPower} CV` : '-';
      return [
        new Date(t.startTime).toLocaleDateString('fr-FR'),
        vehicleName,
        t.startLocation.name,
        t.endLocation.name,
        `${t.distance.toFixed(1)} km`,
        t.purpose || '-',
        `${t.recalculatedIK.toFixed(2)} €`,
      ];
    });

    // Main trips table
    autoTable(doc, {
      startY: 38,
      head: [['Date', 'Véhicule', 'Départ', 'Arrivée', 'Distance', 'Motif', 'IK']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [38, 97, 217] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      foot: [['TOTAL', '', '', '', `${totalKm.toFixed(1)} km`, '', `${recalculatedTotalIK.toFixed(2)} €`]],
      footStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 15;

    // Check if we need a new page for barème
    if (finalY > 150) {
      doc.addPage();
      finalY = 20;
    }

    // Barème section
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Barème kilométrique fiscal 2024', 14, finalY);
    
    const baremeData = IK_BAREME_2024.map(b => [
      b.cv === '7+' ? '7 CV et +' : `${b.cv} CV`,
      `${b.upTo5000.rate} €/km`,
      `${b.from5001To20000.rate} €/km + ${b.from5001To20000.fixed} €`,
      `${b.over20000.rate} €/km`,
    ]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Puissance', '≤ 5000 km', '5001-20000 km', '> 20000 km']],
      body: baremeData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [100, 116, 139] },
    });

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.setFont('helvetica', 'normal');
      doc.text(`${IKTRACKER_URL} - Page ${i}/${pageCount}`, 14, pageHeight - 10);
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
      const pdfContent = generatePDF();
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
        <div className="bg-card rounded-md p-5 shadow-md">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Récapitulatif</h2>
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

        <Button 
          variant="secondary" 
          size="lg" 
          className="w-full"
          onClick={exportZip} 
          disabled={trips.length === 0 || isExporting}
        >
          <Download className={`w-5 h-5 ${isExporting ? 'animate-bounce' : ''}`} />
          Télécharger le relevé pour votre comptable
        </Button>

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

        <div className="bg-card rounded-md p-4 space-y-3">
          <h3 className="text-sm font-medium">Barème IK 2024</h3>
          <div className="text-xs text-muted-foreground space-y-1">
            {IK_BAREME_2024.map(b => (
              <div key={b.cv} className="flex justify-between">
                <span>{b.cv === '7+' ? '7 CV et +' : `${b.cv} CV`}</span>
                <span>{b.upTo5000.rate} €/km (≤5000km)</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom action buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="max-w-lg mx-auto grid grid-cols-2 gap-3">
          <Link to="/app">
            <Button variant="secondary" size="lg" className="w-full">
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
