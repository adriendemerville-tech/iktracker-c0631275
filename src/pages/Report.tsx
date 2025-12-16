import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTrips } from '@/hooks/useTrips';
import { Trip, Vehicle, getIKBareme, IK_BAREME_2024 } from '@/types/trip';
import { TripCard } from '@/components/TripCard';
import { NewTripSheet } from '@/components/NewTripSheet';
import { VehicleForm } from '@/components/VehicleForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, FileSpreadsheet, Plus, Home, UserCircle } from 'lucide-react';

export default function Report() {
  const navigate = useNavigate();
  const { trips, vehicles, savedLocations, deleteTrip, addTrip, addLocation, addVehicle, updateVehicle, getTotalAnnualKm } = useTrips();
  
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);
  
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
  
  const handleAddVehicle = () => {
    setEditingVehicle(null);
    setShowVehicleForm(true);
  };

  const exportToCSV = () => {
    const headers = [
      'Date',
      'Heure départ',
      'Heure arrivée',
      'Propriétaire',
      'Véhicule',
      'Immatriculation',
      'Puissance fiscale (CV)',
      'Lieu de départ',
      'Lieu d\'arrivée',
      'Distance (km)',
      'Motif',
      'Taux IK (€/km)',
      'Montant IK (€)',
    ];

    const rows = trips.map(t => {
      const vehicle = getVehicle(t.vehicleId);
      const bareme = vehicle ? getIKBareme(vehicle.fiscalPower) : null;
      const annualKm = trips
        .filter(trip => trip.vehicleId === t.vehicleId && new Date(trip.startTime).getFullYear() === new Date(t.startTime).getFullYear())
        .reduce((sum, trip) => sum + trip.distance, 0);
      
      let rate = 0;
      if (bareme) {
        if (annualKm <= 5000) rate = bareme.upTo5000.rate;
        else if (annualKm <= 20000) rate = bareme.from5001To20000.rate;
        else rate = bareme.over20000.rate;
      }

      return [
        new Date(t.startTime).toLocaleDateString('fr-FR'),
        new Date(t.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        new Date(t.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        vehicle ? `${vehicle.ownerFirstName} ${vehicle.ownerLastName}` : '',
        vehicle ? `${vehicle.make} ${vehicle.model}` : '',
        vehicle?.licensePlate || '',
        vehicle?.fiscalPower?.toString() || '',
        t.startLocation.name,
        t.endLocation.name,
        t.distance.toFixed(1),
        t.purpose,
        rate.toFixed(3),
        t.ikAmount.toFixed(2),
      ];
    });

    rows.push([]);
    rows.push(['TOTAL', '', '', '', '', '', '', '', '', totalKm.toFixed(1), '', '', totalIK.toFixed(2)]);
    
    rows.push([]);
    rows.push(['Barème kilométrique fiscal 2024']);
    rows.push(['CV', 'Jusqu\'à 5000 km', '5001 à 20000 km', 'Au-delà de 20000 km']);
    IK_BAREME_2024.forEach(b => {
      rows.push([
        b.cv === '7+' ? '7 CV et plus' : `${b.cv} CV`,
        `d × ${b.upTo5000.rate}`,
        `(d × ${b.from5001To20000.rate}) + ${b.from5001To20000.fixed}`,
        `d × ${b.over20000.rate}`,
      ]);
    });

    const csv = [
      headers.join(';'),
      ...rows.map(r => r.join(';')),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `releve-ik-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Relevé des trajets</h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={exportToCSV} disabled={trips.length === 0}>
              <FileSpreadsheet className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
              <UserCircle className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="bg-card rounded-2xl p-5 shadow-md">
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
              <p className="counter-text text-2xl font-bold text-accent">{totalIK.toFixed(0)}€</p>
              <p className="text-xs text-muted-foreground">IK</p>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 rounded-xl p-4 flex items-start gap-3">
          <FileSpreadsheet className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Export comptable</p>
            <p className="text-muted-foreground">
              Cliquez sur l'icône en haut à droite pour télécharger un fichier CSV complet 
              avec toutes les informations nécessaires à votre comptable.
            </p>
          </div>
        </div>

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
                      onDelete={deleteTrip}
                      showDelete
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}

        <div className="bg-card rounded-xl p-4 space-y-3">
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
          <Link to="/">
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
        onOpenChange={setShowNewTrip}
        savedLocations={savedLocations}
        vehicles={vehicles}
        onAddLocation={addLocation}
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
    </div>
  );
}
