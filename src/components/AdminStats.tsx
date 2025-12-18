import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  Users, 
  Route, 
  Euro, 
  Navigation, 
  Activity,
  TrendingUp,
  Calendar,
  FileText,
  FileSpreadsheet,
  Trophy,
  ArrowUp,
  ArrowDown,
  Minus,
  Download,
  Share2
} from 'lucide-react';
import { format, startOfWeek, startOfMonth, startOfYear, subWeeks, subMonths, subYears, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AdminStatsData {
  total_users: number;
  total_trips: number;
  total_km: number;
  total_ik: number;
}

interface DownloadStatsData {
  total_clicks: number;
  unique_users: number;
  avg_clicks_per_user: number;
  pct_users_clicked: number;
}

interface ShareStatsData {
  total_shares: number;
  unique_sharers: number;
  pct_users_shared: number;
}

interface TopUser {
  user_id: string;
  total_trips: number;
  total_km: number;
  total_ik: number;
}

interface RecentSignup {
  user_id: string;
  email: string;
  created_at: string;
}

type PeriodFilter = 'week' | 'month' | 'year' | 'all';
type TopUserSort = 'trips' | 'km' | 'ik';

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
  const [topUserSort, setTopUserSort] = useState<TopUserSort>('trips');

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
  const getDateRange = (isPrevious = false) => {
    const config = periodConfig[period];
    let startDate = config.getStartDate();
    let endDate = new Date();
    
    if (isPrevious && period !== 'all') {
      // Calculate previous period
      switch (period) {
        case 'week':
          endDate = subDays(startDate, 1);
          startDate = subWeeks(startDate, 1);
          break;
        case 'month':
          endDate = subDays(startDate, 1);
          startDate = subMonths(startDate, 1);
          break;
        case 'year':
          endDate = subDays(startDate, 1);
          startDate = subYears(startDate, 1);
          break;
      }
    }
    
    return {
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
    };
  };

  const dateRange = getDateRange();
  const prevDateRange = getDateRange(true);

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

  // Fetch previous period stats for comparison
  const { data: prevStats, isLoading: prevStatsLoading } = useQuery({
    queryKey: ['admin-stats-prev', period],
    queryFn: async () => {
      if (period === 'all') return null;
      const { data, error } = await supabase.rpc('get_admin_stats', {
        start_date: prevDateRange.start_date,
        end_date: prevDateRange.end_date,
      });
      if (error) throw error;
      return data as unknown as AdminStatsData;
    },
    enabled: period !== 'all',
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

  // Fetch top users
  const { data: topUsers = [], isLoading: topUsersLoading } = useQuery({
    queryKey: ['admin-top-users', topUserSort],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_users', { 
        sort_by: topUserSort, 
        limit_count: 10 
      });
      if (error) throw error;
      return data as unknown as TopUser[];
    },
    refetchInterval: 60000,
  });

  // Fetch download stats
  const { data: downloadStats, isLoading: downloadStatsLoading } = useQuery({
    queryKey: ['admin-download-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_download_stats');
      if (error) throw error;
      return data as unknown as DownloadStatsData;
    },
    refetchInterval: 60000,
  });

  // Fetch download clicks by day with period filter
  const { data: downloadClicksByDay = [], isLoading: downloadClicksLoading } = useQuery({
    queryKey: ['admin-download-clicks-by-day', period],
    queryFn: async () => {
      const daysBack = periodConfig[period].daysBack;
      const { data, error } = await supabase.rpc('get_download_clicks_by_day', { days_back: daysBack });
      if (error) throw error;
      return (data as unknown as { day: string; count: number }[]).map(d => ({
        day: format(new Date(d.day), period === 'year' ? 'MMM' : 'dd/MM', { locale: fr }),
        count: Number(d.count),
      }));
    },
    refetchInterval: 60000,
  });

  // Fetch share stats
  const { data: shareStats, isLoading: shareStatsLoading } = useQuery({
    queryKey: ['admin-share-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_share_stats');
      if (error) throw error;
      return data as unknown as ShareStatsData;
    },
    refetchInterval: 60000,
  });

  // Fetch shares by day with period filter
  const { data: sharesByDay = [], isLoading: sharesLoading } = useQuery({
    queryKey: ['admin-shares-by-day', period],
    queryFn: async () => {
      const daysBack = periodConfig[period].daysBack;
      const { data, error } = await supabase.rpc('get_shares_by_day', { days_back: daysBack });
      if (error) throw error;
      return (data as unknown as { day: string; count: number }[]).map(d => ({
        day: format(new Date(d.day), period === 'year' ? 'MMM' : 'dd/MM', { locale: fr }),
        count: Number(d.count),
      }));
    },
    refetchInterval: 60000,
  });


  const { data: recentSignups = [], isLoading: signupsLoading } = useQuery({
    queryKey: ['admin-recent-signups'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recent_signups', { limit_count: 10 });
      if (error) throw error;
      return data as unknown as RecentSignup[];
    },
    refetchInterval: 30000,
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

  const getPrevPeriodLabel = () => {
    switch (period) {
      case 'week': return 'semaine précédente';
      case 'month': return 'mois précédent';
      case 'year': return 'année précédente';
      case 'all': return '';
    }
  };

  // Calculate percentage change
  const getChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Comparison chart data
  const comparisonData = period !== 'all' && stats && prevStats ? [
    { 
      name: 'Utilisateurs', 
      current: stats.total_users, 
      previous: prevStats.total_users,
    },
    { 
      name: 'Trajets', 
      current: stats.total_trips, 
      previous: prevStats.total_trips,
    },
    { 
      name: 'IK (€)', 
      current: Math.round(stats.total_ik), 
      previous: Math.round(prevStats.total_ik),
    },
    { 
      name: 'Distance (km)', 
      current: Math.round(stats.total_km), 
      previous: Math.round(prevStats.total_km),
    },
  ] : [];

  // Change indicator component
  const ChangeIndicator = ({ current, previous }: { current: number; previous: number }) => {
    const change = getChange(current, previous);
    if (change === 0) return <Minus className="w-3 h-3 text-muted-foreground" />;
    if (change > 0) return <ArrowUp className="w-3 h-3 text-green-500" />;
    return <ArrowDown className="w-3 h-3 text-red-500" />;
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(18);
    doc.text('Statistiques Admin', pageWidth / 2, 20, { align: 'center' });
    
    // Period info
    doc.setFontSize(12);
    doc.text(`Période: ${periodConfig[period].label} (${dateRange.start_date} - ${dateRange.end_date})`, pageWidth / 2, 30, { align: 'center' });
    doc.text(`Exporté le: ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, pageWidth / 2, 38, { align: 'center' });

    // Stats table
    autoTable(doc, {
      startY: 50,
      head: [['Métrique', 'Valeur']],
      body: [
        ['Utilisateurs', formatNumber(stats?.total_users || 0)],
        ['Trajets', formatNumber(stats?.total_trips || 0)],
        ['Total IK', formatCurrency(stats?.total_ik || 0)],
        ['Distance totale', formatKm(stats?.total_km || 0)],
        ['Visites simultanées (actuel)', onlineUsers.toString()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Registrations table
    if (registrations.length > 0) {
      const finalY = (doc as any).lastAutoTable?.finalY || 100;
      doc.setFontSize(14);
      doc.text('Nouveaux inscrits par jour', 14, finalY + 15);
      
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Date', 'Nombre']],
        body: registrations.map(r => [r.day, r.count.toString()]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
      });
    }

    doc.save(`stats-admin-${period}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportToCSV = () => {
    // Stats CSV
    const statsRows = [
      ['Métrique', 'Valeur'],
      ['Période', periodConfig[period].label],
      ['Date début', dateRange.start_date],
      ['Date fin', dateRange.end_date],
      ['Utilisateurs', stats?.total_users || 0],
      ['Trajets', stats?.total_trips || 0],
      ['Total IK (€)', stats?.total_ik || 0],
      ['Distance totale (km)', stats?.total_km || 0],
      ['Visites simultanées', onlineUsers],
      [''],
      ['Nouveaux inscrits par jour'],
      ['Date', 'Nombre'],
      ...registrations.map(r => [r.day, r.count]),
    ];

    const csvContent = statsRows.map(row => 
      Array.isArray(row) ? row.join(';') : row
    ).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stats-admin-${period}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-4">
      {/* Period filter and export buttons */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Période :</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
          <div className="flex items-center gap-1 ml-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToPDF}
              disabled={statsLoading}
              className="gap-1.5"
            >
              <FileText className="w-4 h-4" />
              PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToCSV}
              disabled={statsLoading}
              className="gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              CSV
            </Button>
          </div>
        </div>
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

      {/* Recent Signups */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            10 derniers inscrits
          </CardTitle>
        </CardHeader>
        <CardContent>
          {signupsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentSignups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun inscrit récent</p>
          ) : (
            <div className="space-y-2">
              {recentSignups.map((signup, index) => (
                <div 
                  key={signup.user_id} 
                  className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground w-5">{index + 1}.</span>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">{signup.email}</p>
                      <p className="text-xs text-muted-foreground font-mono">{signup.user_id.slice(0, 8)}...</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(signup.created_at), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(signup.created_at), 'HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Download App Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Téléchargement de l'application
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {downloadStatsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{downloadStats?.total_clicks || 0}</p>
                <p className="text-xs text-muted-foreground">Clics totaux</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-blue-500">{downloadStats?.unique_users || 0}</p>
                <p className="text-xs text-muted-foreground">Utilisateurs uniques</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-amber-500">{downloadStats?.avg_clicks_per_user || 0}</p>
                <p className="text-xs text-muted-foreground">Clics/utilisateur</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-green-500">{downloadStats?.pct_users_clicked || 0}%</p>
                <p className="text-xs text-muted-foreground">Utilisateurs ayant cliqué</p>
              </div>
            </div>
          )}
          
          {/* Download clicks chart with period filter */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Évolution {getPeriodLabel()}</h4>
            {downloadClicksLoading ? (
              <Skeleton className="h-[180px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={downloadClicksByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
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
                    name="Clics"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 2 }}
                    activeDot={{ r: 4, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Share Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Partages de l'application
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {shareStatsLoading ? (
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{shareStats?.total_shares || 0}</p>
                <p className="text-xs text-muted-foreground">Partages totaux</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-blue-500">{shareStats?.unique_sharers || 0}</p>
                <p className="text-xs text-muted-foreground">Partageurs uniques</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-green-500">{shareStats?.pct_users_shared || 0}%</p>
                <p className="text-xs text-muted-foreground">Utilisateurs ayant partagé</p>
              </div>
            </div>
          )}
          
          {/* Shares chart with period filter */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Évolution {getPeriodLabel()}</h4>
            {sharesLoading ? (
              <Skeleton className="h-[180px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={sharesByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
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
                    name="Partages"
                    stroke="hsl(142, 71%, 45%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(142, 71%, 45%)', strokeWidth: 0, r: 2 }}
                    activeDot={{ r: 4, stroke: 'hsl(142, 71%, 45%)', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison chart */}
      {period !== 'all' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Comparaison : {periodConfig[period].label} actuel vs {getPrevPeriodLabel()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading || prevStatsLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : comparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={comparisonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 11 }} 
                    tickLine={false} 
                    axisLine={false}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => [
                      new Intl.NumberFormat('fr-FR').format(value),
                      name === 'current' ? periodConfig[period].label : getPrevPeriodLabel()
                    ]}
                  />
                  <Legend 
                    formatter={(value) => value === 'current' ? periodConfig[period].label : getPrevPeriodLabel()}
                  />
                  <Bar 
                    dataKey="current" 
                    fill="hsl(var(--primary))" 
                    radius={[12, 12, 12, 12]}
                    name="current"
                  />
                  <Bar 
                    dataKey="previous" 
                    fill="hsl(var(--muted-foreground))" 
                    radius={[12, 12, 12, 12]}
                    opacity={0.5}
                    name="previous"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent>
        </Card>
      )}

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

      {/* Top users table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Top 10 utilisateurs
            </CardTitle>
            <ToggleGroup 
              type="single" 
              value={topUserSort} 
              onValueChange={(value) => value && setTopUserSort(value as TopUserSort)}
              className="bg-muted/50 p-1 rounded-lg"
            >
              <ToggleGroupItem value="trips" className="px-3 py-1 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm">
                Trajets
              </ToggleGroupItem>
              <ToggleGroupItem value="km" className="px-3 py-1 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm">
                Km
              </ToggleGroupItem>
              <ToggleGroupItem value="ik" className="px-3 py-1 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm">
                IK
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent>
          {topUsersLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : topUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun utilisateur trouvé</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>ID Utilisateur</TableHead>
                    <TableHead className="text-right">Trajets</TableHead>
                    <TableHead className="text-right">Distance</TableHead>
                    <TableHead className="text-right">IK</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topUsers.map((user, index) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {user.user_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatNumber(user.total_trips)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatKm(user.total_km)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(user.total_ik)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
