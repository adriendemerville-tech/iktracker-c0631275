import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Route, 
  Navigation, 
  Euro, 
  Car, 
  Map, 
  Share2, 
  Calendar,
  User,
  Crown,
  Mail,
  MapPin,
  CheckCircle2,
  MousePointerClick,
  Compass
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserKPISheetProps {
  user: {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
    isAdmin: boolean;
    created_at: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserStats {
  total_trips: number;
  total_km: number;
  total_ik: number;
  vehicles_count: number;
  tours_count: number;
  shares_count: number;
  first_trip_date: string | null;
  last_trip_date: string | null;
  has_takeout_import: boolean;
  takeout_import_date: string | null;
  // Source breakdown
  calendar_trips_count: number;
  manual_trips_count: number;
  tour_trips_count: number;
  calendar_pct: number;
  manual_pct: number;
  tour_pct: number;
}

export function UserKPISheet({ user, open, onOpenChange }: UserKPISheetProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-user-stats', user?.user_id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.rpc('get_user_stats', {
        _user_id: user.user_id,
      });
      if (error) throw error;
      return data as unknown as UserStats;
    },
    enabled: open && !!user,
  });

  const displayName = user?.first_name || user?.last_name 
    ? `${user?.first_name} ${user?.last_name}`.trim() 
    : user?.email || 'Utilisateur';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {displayName}
            {user?.isAdmin && (
              <Badge className="bg-amber-500 hover:bg-amber-600 ml-2">
                <Crown className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="space-y-1">
            {user?.email && (
              <span className="flex items-center gap-2 text-sm">
                <Mail className="w-3 h-3" />
                {user.email}
              </span>
            )}
            <span className="flex items-center gap-2 text-sm">
              <Calendar className="w-3 h-3" />
              Inscrit le {user?.created_at ? format(new Date(user.created_at), 'dd MMMM yyyy', { locale: fr }) : '-'}
            </span>
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : stats ? (
          <div className="space-y-4">
            {/* Main KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Route className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase">Trajets</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.total_trips.toLocaleString('fr-FR')}</p>
                </CardContent>
              </Card>

              <Card className="bg-blue-500/5 border-blue-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                    <Navigation className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase">Distance</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.total_km.toLocaleString('fr-FR')} <span className="text-sm font-normal">km</span></p>
                </CardContent>
              </Card>

              <Card className="bg-emerald-500/5 border-emerald-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                    <Euro className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase">IK</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.total_ik.toLocaleString('fr-FR')} <span className="text-sm font-normal">€</span></p>
                </CardContent>
              </Card>

              <Card className="bg-purple-500/5 border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                    <Car className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase">Véhicules</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.vehicles_count}</p>
                </CardContent>
              </Card>
            </div>

            {/* Secondary stats */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Map className="w-4 h-4" />
                    Tournées effectuées
                  </span>
                  <span className="font-semibold">{stats.tours_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Share2 className="w-4 h-4" />
                    Rapports partagés
                  </span>
                  <span className="font-semibold">{stats.shares_count}</span>
                </div>
              </CardContent>
            </Card>

            {/* Trip source breakdown */}
            {stats.total_trips > 0 && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Répartition des trajets
                  </p>
                  
                  {/* Calendar trips */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        Calendrier
                      </span>
                      <span className="font-semibold">{stats.calendar_pct}%</span>
                    </div>
                    <Progress value={stats.calendar_pct} className="h-2 [&>div]:bg-blue-500" />
                    <p className="text-xs text-muted-foreground">{stats.calendar_trips_count} trajets</p>
                  </div>

                  {/* Manual trips */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <MousePointerClick className="w-4 h-4 text-orange-500" />
                        Ajout manuel
                      </span>
                      <span className="font-semibold">{stats.manual_pct}%</span>
                    </div>
                    <Progress value={stats.manual_pct} className="h-2 [&>div]:bg-orange-500" />
                    <p className="text-xs text-muted-foreground">{stats.manual_trips_count} trajets</p>
                  </div>

                  {/* Tour trips */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Compass className="w-4 h-4 text-purple-500" />
                        Mode tournée
                      </span>
                      <span className="font-semibold">{stats.tour_pct}%</span>
                    </div>
                    <Progress value={stats.tour_pct} className="h-2 [&>div]:bg-purple-500" />
                    <p className="text-xs text-muted-foreground">{stats.tour_trips_count} trajets</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Google Maps Import badge */}
            {stats.has_takeout_import && (
              <Card className="bg-emerald-500/10 border-emerald-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Import Google Maps réussi
                      </p>
                      {stats.takeout_import_date && (
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(stats.takeout_import_date), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activity period */}
            {(stats.first_trip_date || stats.last_trip_date) && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground mb-2">
                    Période d'activité
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-muted-foreground">Premier trajet</p>
                      <p className="font-medium">
                        {stats.first_trip_date 
                          ? format(new Date(stats.first_trip_date), 'dd MMM yyyy', { locale: fr })
                          : '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Dernier trajet</p>
                      <p className="font-medium">
                        {stats.last_trip_date 
                          ? format(new Date(stats.last_trip_date), 'dd MMM yyyy', { locale: fr })
                          : '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* User ID for reference */}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                ID: <span className="font-mono">{user?.user_id}</span>
              </p>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Aucune donnée disponible
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
