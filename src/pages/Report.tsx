import { Trip } from '@/types/trip';
import { TripCard } from '@/components/TripCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { IK_RATE } from '@/types/trip';

interface ReportPageProps {
  trips: Trip[];
  onDeleteTrip: (id: string) => void;
}

export function ReportPage({ trips, onDeleteTrip }: ReportPageProps) {
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

  const exportToCSV = () => {
    const headers = ['Date', 'Heure départ', 'Heure arrivée', 'Départ', 'Arrivée', 'Distance (km)', 'Motif', 'IK (€)'];
    const rows = trips.map(t => [
      new Date(t.startTime).toLocaleDateString('fr-FR'),
      new Date(t.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      new Date(t.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      t.startLocation.name,
      t.endLocation.name,
      t.distance.toFixed(1),
      t.purpose,
      t.ikAmount.toFixed(2),
    ]);

    const csv = [
      headers.join(';'),
      ...rows.map(r => r.join(';')),
      '',
      `Total;;;;;${totalKm.toFixed(1)};;${totalIK.toFixed(2)}`,
      `Taux IK: ${IK_RATE} €/km`,
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `releve-ik-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Relevé des trajets</h1>
          <Button variant="ghost" size="icon" onClick={exportToCSV} disabled={trips.length === 0}>
            <Download className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Summary */}
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

        {/* Trips by month */}
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
                {monthTrips.map(trip => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onDelete={onDeleteTrip}
                    showDelete
                  />
                ))}
              </div>
            </div>
          ))
        )}

        {/* IK Rate Info */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>Taux IK appliqué : {IK_RATE} €/km</p>
          <p className="text-xs mt-1">(Barème 5CV, &lt; 5000 km)</p>
        </div>
      </main>
    </div>
  );
}
