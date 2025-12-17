import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTrips } from '@/hooks/useTrips';
import { useTourTracker, TourStop } from '@/hooks/useTourTracker';
import { usePreferences } from '@/hooks/usePreferences';
import { calculateDrivingDistance } from '@/hooks/useGeolocation';
import { Counter } from '@/components/Counter';
import { TripCard } from '@/components/TripCard';
import { VehicleCard } from '@/components/VehicleCard';
import { NewTripSheet } from '@/components/NewTripSheet';
import { VehicleForm } from '@/components/VehicleForm';
import { TourButton } from '@/components/TourButton';
import { TourLogSheet } from '@/components/TourLogSheet';
import { Button } from '@/components/ui/button';
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
import { FileText, Plus, Car, MapPin, ChevronRight, UserCircle, Truck } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
const Index = () => {
  const navigate = useNavigate();
  const { preferences } = usePreferences();
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
  const {
    isActive: isTourActive,
    isLoading: isTourLoading,
    stops: tourStops,
    totalDistanceKm,
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

  const handleStopTour = () => {
    // Save tour to history before clearing
    if (tourStops.length >= 2) {
      setLastTour([...tourStops]);
    }
    stopTour();
    clearTour();
    setShowTourLog(false);
    toast.info("Tournée terminée", {
      description: "Consultez l'historique pour enregistrer",
    });
  };

  const handleConvertToTrips = async (stops: TourStop[]) => {
    console.log('handleConvertToTrips called with stops:', stops);
    console.log('vehicles:', vehicles);
    
    if (stops.length < 2) {
      toast.error("Impossible de créer le trajet", {
        description: "Il faut au moins 2 arrêts pour créer un trajet",
      });
      return;
    }
    
    if (vehicles.length === 0) {
      toast.error("Impossible de créer le trajet", {
        description: "Ajoutez d'abord un véhicule",
      });
      return;
    }

    toast.info("Calcul de la distance totale...");

    // Get first and last stops
    const firstStop = stops[0];
    const lastStop = stops[stops.length - 1];
    const vehicleId = vehicles[0].id;

    // Calculate total distance between all consecutive stops
    let totalDistance = 0;
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

    console.log(`Total distance: ${totalDistance} km`);

    try {
      const result = await addTrip({
        vehicleId,
        startLocation: {
          id: firstStop.id,
          name: firstStop.city || firstStop.address || 'Position',
          address: firstStop.address,
          lat: firstStop.lat,
          lng: firstStop.lng,
          type: 'other',
        },
        endLocation: {
          id: lastStop.id,
          name: lastStop.city || lastStop.address || 'Position',
          address: lastStop.address,
          lat: lastStop.lat,
          lng: lastStop.lng,
          type: 'other',
        },
        distance: totalDistance,
        purpose: 'Tournée',
        startTime: firstStop.timestamp,
        endTime: lastStop.timestamp,
      });
      
      console.log('Tour trip created:', result);
      
      if (result) {
        toast.success("Tournée enregistrée", {
          description: `${totalDistance.toFixed(1)} km - ${firstStop.city || 'Départ'} → ${lastStop.city || 'Arrivée'}`,
        });
        clearTour();
        setShowTourLog(false);
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    } catch (e) {
      console.error('Failed to create tour trip:', e);
      toast.error("Erreur lors de l'enregistrement de la tournée");
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground px-4 pt-12 pb-8 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#2661D9' }}
            >
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">IK Tracker</h1>
              <p className="text-sm opacity-80">Indemnités Kilométriques</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/profile')}
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            >
              <UserCircle className="w-6 h-6" />
            </Button>
          </div>

          {/* Counters */}
          <div className="grid grid-cols-2 gap-4">
            <Counter value={totalKm} label="Distance totale" unit="km" />
            <Counter value={totalIK} label="Indemnités" unit="€" variant="accent" decimals={2} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-32">
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
            <div className="text-center py-8 bg-card rounded-2xl">
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
            <div className="text-center py-12 bg-card rounded-2xl">
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
        onStop={handleStopTour}
        onClear={clearTour}
        onConvertToTrips={handleConvertToTrips}
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
        onStop={() => {}}
        onClear={() => setLastTour(null)}
        onConvertToTrips={(stops) => {
          handleConvertToTrips(stops);
          setLastTour(null);
          setShowTourHistory(false);
        }}
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
