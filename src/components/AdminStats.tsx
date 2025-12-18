import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Users, 
  Route, 
  Euro, 
  Navigation, 
  Activity,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { format, subDays, subMonths, subYears, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AdminStatsData {
  total_users: number;
  total_trips: number;
  total_km: number;
  total_ik: number;
}

type PeriodFilter = 'week' | 'month' | 'year' | 'all';

const periodConfig: Record<PeriodFilter, { label: string; daysBack: number; getStartDate: () => Date }> = {
  week: { 
    label: 'Semaine', 
    daysBack: 7,
    getStartDate: () => startOfWeek(new Date(), { weekStartsOn: 1 })
  },
  month: { 
    label: 'Mois', 
    daysBack: 30,
    getStartDate: () => startOfMonth(new Date())
  },
  year: { 
    label: 'Année', 
    daysBack: 365,
    getStartDate: () => startOfYear(new Date())
  },
  all: { 
    label: 'Tout', 
    daysBack: 3650,
    getStartDate: () => new Date('2020-01-01')
  },
};

export function AdminStats() {
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [period, setPeriod] = useState<PeriodFilter>('month');

  // Track presence for simultaneous visits
  useEffect(() => {
    const channel = supabase.channel('admin-presence', {
      config: {
        presence: {
          key: 'online-users',
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).reduce((acc, key) => {
          return acc + (state[key] as any[]).length;
        }, 0);
        setOnlineUsers(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Get date range based on period
  const getDateRange = () => {
    const config = periodConfig[period];
    const startDate = config.getStartDate();
    const endDate = new Date();
    return {
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
    };
  };

  const dateRange = getDateRange();

  // Fetch admin stats with period filter
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats', period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_stats', {
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      });
      if (error) throw error;
      return data as unknown as AdminStatsData;
    },
    refetchInterval: 30000,
  });

  // Fetch registrations by day with period filter
  const { data: registrations = [], isLoading: registrationsLoading } = useQuery({
    queryKey: ['admin-registrations', period],
    queryFn: async () => {
      const daysBack = periodConfig[period].daysBack;
      const { data, error } = await supabase.rpc('get_registrations_by_day', { days_back: daysBack });
      if (error) throw error;
      return (data as unknown as { day: string; count: number }[]).map(d => ({
        day: format(new Date(d.day), period === 'year' ? 'MMM' : 'dd/MM', { locale: fr }),
        count: Number(d.count),
      }));
    },
    refetchInterval: 60000,
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatKm = (num: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num) + ' km';
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'week': return 'cette semaine';
      case 'month': return 'ce mois';
      case 'year': return 'cette année';
      case 'all': return 'au total';
    }
  };

  return (
    <div className="space-y-4">
      {/* Period filter */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Période :</span>
        </div>
        <ToggleGroup 
          type="single" 
          value={period} 
          onValueChange={(value) => value && setPeriod(value as PeriodFilter)}
          className="bg-muted/50 p-1 rounded-lg"
        >
          {Object.entries(periodConfig).map(([key, config]) => (
            <ToggleGroupItem 
              key={key} 
              value={key}
              className="px-3 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              {config.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Real-time and main stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Online users - real-time */}
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative">
                <Activity className="w-5 h-5 text-green-500" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              <span className="text-xs text-muted-foreground">En ligne</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{onlineUsers}</p>
            <p className="text-xs text-muted-foreground">visites simultanées</p>
          </CardContent>
        </Card>

        {/* Total users */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-xs text-muted-foreground">Utilisateurs</span>
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-2xl font-bold">{formatNumber(stats?.total_users || 0)}</p>
                <p className="text-xs text-muted-foreground">{getPeriodLabel()}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total trips */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Route className="w-5 h-5 text-blue-500" />
              <span className="text-xs text-muted-foreground">Trajets</span>
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-2xl font-bold">{formatNumber(stats?.total_trips || 0)}</p>
                <p className="text-xs text-muted-foreground">{getPeriodLabel()}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total IK */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Euro className="w-5 h-5 text-amber-500" />
              <span className="text-xs text-muted-foreground">Total IK</span>
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <p className="text-2xl font-bold">{formatCurrency(stats?.total_ik || 0)}</p>
                <p className="text-xs text-muted-foreground">{getPeriodLabel()}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total KM */}
        <Card className="col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Navigation className="w-5 h-5 text-purple-500" />
              <span className="text-xs text-muted-foreground">Distance totale</span>
            </div>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <p className="text-2xl font-bold">{formatKm(stats?.total_km || 0)}</p>
                <p className="text-xs text-muted-foreground">{getPeriodLabel()}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Registrations chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Nouveaux inscrits ({periodConfig[period].label.toLowerCase()})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {registrationsLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={registrations}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  name="Nouveaux inscrits"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
