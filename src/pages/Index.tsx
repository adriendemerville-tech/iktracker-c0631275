import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTrips } from '@/hooks/useTrips';
import { Counter } from '@/components/Counter';
import { TripCard } from '@/components/TripCard';
import { NewTripSheet } from '@/components/NewTripSheet';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Car, MapPin } from 'lucide-react';

const Index = () => {
  const { trips, savedLocations, totalKm, totalIK, addTrip, addLocation } = useTrips();
  const [showNewTrip, setShowNewTrip] = useState(false);

  const recentTrips = trips.slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground px-4 pt-12 pb-8 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary-foreground/20 rounded-full flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">IK Tracker</h1>
              <p className="text-sm opacity-80">Indemnités Kilométriques</p>
            </div>
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
        {/* Recent trips */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Derniers trajets</h2>
            {trips.length > 3 && (
              <Link to="/report" className="text-sm text-primary font-medium">
                Voir tout
              </Link>
            )}
          </div>

          {recentTrips.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-2xl">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Aucun trajet enregistré</p>
              <p className="text-sm text-muted-foreground mt-1">
                Commencez par créer votre premier trajet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Bottom action buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="max-w-lg mx-auto grid grid-cols-2 gap-3">
          <Link to="/report">
            <Button variant="secondary" size="lg" className="w-full">
              <FileText className="w-5 h-5" />
              Voir le relevé
            </Button>
          </Link>
          <Button variant="gradient" size="lg" onClick={() => setShowNewTrip(true)}>
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
        onAddLocation={addLocation}
        onCreateTrip={addTrip}
      />
    </div>
  );
};

export default Index;
