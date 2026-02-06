import { useEffect, useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { lazy, Suspense } from 'react';
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
  Share2,
  Globe,
  MousePointer,
  Smartphone,
  Monitor,
  Tablet,
  BarChart3,
  Calculator,
  UserPlus,
  Map,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { format, startOfWeek, startOfMonth, startOfYear, subWeeks, subMonths, subYears, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

// PDF export has been removed - export to CSV only
import { DraggableMarketingCards } from '@/components/admin/DraggableMarketingCards';
import { DraggableStatsSection } from '@/components/admin/DraggableStatsSection';
import { AdaptiveChart } from '@/components/admin/AdaptiveChart';
import { useIsMobile } from '@/hooks/use-mobile';

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

interface TakeoutImportStatsData {
  total_attempts: number;
  successful_imports: number;
  unique_users_imported: number;
}

interface MarketingStatsData {
  total_views: number;
  unique_sessions: number;
  total_cta_clicks: number;
  total_simulations: number;
  total_signup_clicks: number;
  mobile_views: number;
  desktop_views: number;
  tablet_views: number;
  mobile_pct: number;
  desktop_pct: number;
}

interface MarketingViewsByDay {
  day: string;
  views: number;
  unique_visitors: number;
}

interface SignupClicksByDay {
  day: string;
  clicks: number;
}

interface MarketingStatsByPage {
  page: string;
  views: number;
  cta_clicks: number;
  simulations: number;
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

interface MonthlyStats {
  month: string;
  total_users: number;
  total_trips: number;
  total_km: number;
  total_ik: number;
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

const DEFAULT_SECTION_ORDER = [
  'main-stats',
  'recent-signups',
  'download-stats',
  'share-stats',
  'comparison-chart',
  'registrations-chart',
  'top-users',
];

const DEFAULT_MARKETING_SECTION_ORDER = [
  'marketing-views-chart',
  'marketing-signup-clicks-chart',
  'bareme-simulations-chart',
  'marketing-stats-by-page',
];

export function AdminStats() {
  const queryClient = useQueryClient();
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [topUserSort, setTopUserSort] = useState<TopUserSort>('trips');
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;

  // Refresh all admin stats at 7:00 AM every day
  useEffect(() => {
    const scheduleRefresh = () => {
      const now = new Date();
      const next7AM = new Date(now);
      next7AM.setHours(7, 0, 0, 0);
      
      // If it's already past 7 AM today, schedule for tomorrow
      if (now >= next7AM) {
        next7AM.setDate(next7AM.getDate() + 1);
      }
      
      const msUntil7AM = next7AM.getTime() - now.getTime();
      
      return setTimeout(() => {
        // Invalidate all admin queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        queryClient.invalidateQueries({ queryKey: ['admin-stats-prev'] });
        queryClient.invalidateQueries({ queryKey: ['admin-registrations'] });
        queryClient.invalidateQueries({ queryKey: ['admin-top-users'] });
        queryClient.invalidateQueries({ queryKey: ['admin-download-stats'] });
        queryClient.invalidateQueries({ queryKey: ['admin-download-clicks-by-day'] });
        queryClient.invalidateQueries({ queryKey: ['admin-share-stats'] });
        queryClient.invalidateQueries({ queryKey: ['admin-shares-by-day'] });
        queryClient.invalidateQueries({ queryKey: ['admin-marketing-stats'] });
        queryClient.invalidateQueries({ queryKey: ['admin-marketing-views-by-day'] });
        queryClient.invalidateQueries({ queryKey: ['admin-signup-clicks-by-day'] });
        queryClient.invalidateQueries({ queryKey: ['admin-marketing-by-page'] });
        queryClient.invalidateQueries({ queryKey: ['admin-recent-signups'] });
        queryClient.invalidateQueries({ queryKey: ['admin-total-tours'] });
        queryClient.invalidateQueries({ queryKey: ['admin-monthly-stats'] });
        queryClient.invalidateQueries({ queryKey: ['admin-takeout-import-stats'] });
        queryClient.invalidateQueries({ queryKey: ['admin-bareme-simulations-by-day'] });
        
        // Schedule next refresh
        scheduleRefresh();
      }, msUntil7AM);
    };
    
    const timerId = scheduleRefresh();
    return () => clearTimeout(timerId);
  }, [queryClient]);
  
  // Section ordering for drag and drop
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('admin-stats-section-order');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_SECTION_ORDER;
      }
    }
    return DEFAULT_SECTION_ORDER;
  });

  // Marketing blocks ordering (charts + table)
  const [marketingSectionOrder, setMarketingSectionOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('admin-marketing-section-order');
    if (saved) {
      try {
        const savedOrder = JSON.parse(saved) as string[];
        const filtered = savedOrder.filter((id) => DEFAULT_MARKETING_SECTION_ORDER.includes(id));
        const missing = DEFAULT_MARKETING_SECTION_ORDER.filter((id) => !filtered.includes(id));
        return [...filtered, ...missing];
      } catch {
        return DEFAULT_MARKETING_SECTION_ORDER;
      }
    }
    return DEFAULT_MARKETING_SECTION_ORDER;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSectionOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('admin-stats-section-order', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  const handleMarketingSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setMarketingSectionOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('admin-marketing-section-order', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

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

  // Fetch admin stats with period filter - refresh every hour
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
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });

  // Fetch previous period stats for comparison - refresh every hour
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
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });

  // Fetch registrations by day with period filter - refresh every hour
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
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });

  // Fetch top users - refresh every hour
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
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });

  // Fetch download stats - refresh every hour
  const { data: downloadStats, isLoading: downloadStatsLoading } = useQuery({
    queryKey: ['admin-download-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_download_stats');
      if (error) throw error;
      return data as unknown as DownloadStatsData;
    },
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });

  // Fetch download clicks by day with period filter - refresh every hour
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
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });

  // Fetch share stats - refresh every hour
  const { data: shareStats, isLoading: shareStatsLoading } = useQuery({
    queryKey: ['admin-share-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_share_stats');
      if (error) throw error;
      return data as unknown as ShareStatsData;
    },
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });

  // Fetch shares by day with period filter - refresh every hour
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
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });

  // Fetch marketing stats - refresh every hour
  const { data: marketingStats, isLoading: marketingStatsLoading } = useQuery({
    queryKey: ['admin-marketing-stats', period],
    queryFn: async () => {
      const daysBack = periodConfig[period].daysBack;
      const { data, error } = await supabase.rpc('get_marketing_stats', { days_back: daysBack });
      if (error) throw error;
      return data as unknown as MarketingStatsData;
    },
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });

  // Fetch marketing views by day - refresh every hour
  const { data: marketingViewsByDay = [], isLoading: marketingViewsLoading } = useQuery({
    queryKey: ['admin-marketing-views-by-day', period],
    queryFn: async () => {
      const daysBack = periodConfig[period].daysBack;
      const { data, error } = await supabase.rpc('get_marketing_views_by_day', { days_back: daysBack });
      if (error) throw error;
      return (data as unknown as { day: string; views: number; unique_visitors: number }[]).map(d => ({
        day: format(new Date(d.day), period === 'year' ? 'MMM' : 'dd/MM', { locale: fr }),
        views: Number(d.views),
        unique_visitors: Number(d.unique_visitors),
      }));
    },
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });

  // Fetch signup clicks by day - refresh every hour
  const { data: signupClicksByDay = [], isLoading: signupClicksLoading } = useQuery({
    queryKey: ['admin-signup-clicks-by-day', period],
    queryFn: async () => {
      const config = periodConfig[period];
      const startDate = config.getStartDate();
      const endDate = new Date();
      
      const { data, error } = await supabase.rpc('get_signup_clicks_by_day', { 
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });
      if (error) throw error;
      return (data as unknown as { day: string; clicks: number }[]).map(d => ({
        day: format(new Date(d.day), period === 'year' ? 'MMM' : 'dd/MM', { locale: fr }),
        clicks: Number(d.clicks),
      }));
    },
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });

  // Fetch marketing stats by page - refresh every hour
  const { data: marketingByPage = [], isLoading: marketingByPageLoading } = useQuery({
    queryKey: ['admin-marketing-by-page', period],
    queryFn: async () => {
      const daysBack = periodConfig[period].daysBack;
      const { data, error } = await supabase.rpc('get_marketing_stats_by_page', { days_back: daysBack });
      if (error) throw error;
      return data as unknown as MarketingStatsByPage[];
    },
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });

  // Fetch bareme simulations by day with period filter - refresh every hour
  const { data: baremeSimulationsByDay = [], isLoading: baremeSimulationsLoading } = useQuery({
    queryKey: ['admin-bareme-simulations-by-day', period],
    queryFn: async () => {
      const daysBack = periodConfig[period].daysBack;
      const { data, error } = await supabase.rpc('get_bareme_simulations_by_day', { days_back: daysBack });
      if (error) throw error;
      return (data as unknown as { day: string; count: number }[]).map(d => ({
        day: format(new Date(d.day), period === 'year' ? 'MMM' : 'dd/MM', { locale: fr }),
        count: Number(d.count),
      }));
    },
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });

  // Fetch recent signups - refresh every hour
  const { data: recentSignups = [], isLoading: signupsLoading } = useQuery({
    queryKey: ['admin-recent-signups'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recent_signups', { limit_count: 10 });
      if (error) throw error;
      return data as unknown as RecentSignup[];
    },
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });

  // Fetch total tours count (excluding admins) - refresh every hour
  const { data: totalToursCount = 0, isLoading: toursCountLoading } = useQuery({
    queryKey: ['admin-total-tours', period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_total_tours_count', {
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      });
      if (error) throw error;
      return data as number;
    },
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });

  // Fetch monthly stats for 5-month trend chart - refresh every hour
  const { data: monthlyStats = [], isLoading: monthlyStatsLoading } = useQuery({
    queryKey: ['admin-monthly-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_stats', { months_back: 5 });
      if (error) throw error;
      return (data as unknown as MonthlyStats[]).map(d => ({
        month: d.month,
        users: Number(d.total_users),
        trips: Number(d.total_trips),
        km: Math.round(Number(d.total_km)),
        ik: Math.round(Number(d.total_ik)),
      }));
    },
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });

  // Fetch Google Takeout import stats - refresh every hour
  const { data: takeoutImportStats, isLoading: takeoutImportStatsLoading } = useQuery({
    queryKey: ['admin-takeout-import-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_takeout_import_stats');
      if (error) throw error;
      return data as unknown as TakeoutImportStatsData;
    },
    refetchInterval: 60 * 60 * 1000, // 1 hour
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

  // Marketing cards data for drag and drop
  const marketingCardsData = useMemo(() => [
    {
      id: 'views',
      icon: <Globe className="w-5 h-5 text-blue-500" />,
      label: 'Visites',
      value: formatNumber(marketingStats?.total_views || 0),
      subValue: getPeriodLabel(),
      isLoading: marketingStatsLoading,
    },
    {
      id: 'unique-visitors',
      icon: <Users className="w-5 h-5 text-green-500" />,
      label: 'Visiteurs uniques',
      value: formatNumber(marketingStats?.unique_sessions || 0),
      subValue: getPeriodLabel(),
      isLoading: marketingStatsLoading,
    },
    {
      id: 'cta-clicks',
      icon: <MousePointer className="w-5 h-5 text-amber-500" />,
      label: 'Clics CTA',
      value: formatNumber(marketingStats?.total_cta_clicks || 0),
      subValue: getPeriodLabel(),
      isLoading: marketingStatsLoading,
    },
    {
      id: 'simulations',
      icon: <Calculator className="w-5 h-5 text-purple-500" />,
      label: 'Simulations IK',
      value: formatNumber(marketingStats?.total_simulations || 0),
      subValue: getPeriodLabel(),
      isLoading: marketingStatsLoading,
    },
    {
      id: 'signup-clicks',
      icon: <UserPlus className="w-5 h-5 text-emerald-500" />,
      label: 'Clics inscription',
      value: formatNumber(marketingStats?.total_signup_clicks || 0),
      subValue: getPeriodLabel(),
      isLoading: marketingStatsLoading,
    },
    {
      id: 'mobile',
      icon: <Smartphone className="w-5 h-5 text-pink-500" />,
      label: 'Mobile',
      value: `${marketingStats?.mobile_pct || 0}%`,
      subValue: `${formatNumber(marketingStats?.mobile_views || 0)} visites`,
      isLoading: marketingStatsLoading,
    },
    {
      id: 'desktop',
      icon: <Monitor className="w-5 h-5 text-slate-500" />,
      label: 'Desktop',
      value: `${marketingStats?.desktop_pct || 0}%`,
      subValue: `${formatNumber(marketingStats?.desktop_views || 0)} visites`,
      isLoading: marketingStatsLoading,
    },
  ], [marketingStats, marketingStatsLoading, period]);

  // PDF export removed - use CSV instead

  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshAllStats = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-stats-prev'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-registrations'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-top-users'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-download-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-download-clicks-by-day'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-share-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-shares-by-day'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-marketing-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-marketing-views-by-day'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-signup-clicks-by-day'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-marketing-by-page'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-recent-signups'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-total-tours'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-takeout-import-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-monthly-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-bareme-simulations-by-day'] }),
    ]);
    // Small delay to show animation
    setTimeout(() => setIsRefreshing(false), 500);
  }, [queryClient]);

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
                className="px-3 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
              >
                {config.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="flex items-center gap-1 ml-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshAllStats}
              disabled={isRefreshing}
              className="gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Actualisation...' : 'Actualiser'}
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

      {/* Marketing KPIs Section */}
      <div className="border-b border-border pb-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />
            KPI Marketing
          </h2>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-700 dark:text-green-400 rounded-full text-xs">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Visites admin exclues des statistiques
          </div>
        </div>

        {/* Marketing Stats Cards - Draggable on desktop */}
        <DraggableMarketingCards cards={marketingCardsData} />

        {/* Marketing charts + table - Draggable (desktop only handle, but sortable context always present) */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleMarketingSectionDragEnd}
        >
          <SortableContext items={marketingSectionOrder} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-4 mb-6">
              {marketingSectionOrder.map((blockId) => {
                switch (blockId) {
                  case 'marketing-views-chart':
                    return (
                      <DraggableStatsSection key={blockId} id={blockId}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-500" />
                            Visites par jour
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <AdaptiveChart
                            data={marketingViewsByDay}
                            xAxisKey="day"
                            lines={[
                              { dataKey: 'views', name: 'Visites', stroke: 'hsl(var(--primary))' },
                              { dataKey: 'unique_visitors', name: 'Visiteurs uniques', stroke: 'hsl(var(--chart-2))' },
                            ]}
                            isLoading={marketingViewsLoading}
                            height={220}
                            baseDataPoints={14}
                          />
                        </CardContent>
                      </DraggableStatsSection>
                    );

                  case 'marketing-signup-clicks-chart':
                    return (
                      <DraggableStatsSection key={blockId} id={blockId}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-emerald-500" />
                            Clics inscription par jour
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <AdaptiveChart
                            data={signupClicksByDay}
                            xAxisKey="day"
                            lines={[
                              { dataKey: 'clicks', name: 'Clics inscription', stroke: 'hsl(142, 76%, 36%)', showDots: true },
                            ]}
                            isLoading={signupClicksLoading}
                            height={220}
                            baseDataPoints={14}
                          />
                        </CardContent>
                      </DraggableStatsSection>
                    );

                  case 'bareme-simulations-chart':
                    return (
                      <DraggableStatsSection key={blockId} id={blockId}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-purple-500" />
                            Simulations IK barème
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <AdaptiveChart
                            data={baremeSimulationsByDay}
                            xAxisKey="day"
                            lines={[
                              { dataKey: 'count', name: 'Simulations', stroke: 'hsl(270, 70%, 50%)', showDots: true },
                            ]}
                            isLoading={baremeSimulationsLoading}
                            height={220}
                            baseDataPoints={14}
                          />
                        </CardContent>
                      </DraggableStatsSection>
                    );

                  case 'marketing-stats-by-page':
                    return (
                      <DraggableStatsSection key={blockId} id={blockId} className="md:col-span-2">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5 text-green-500" />
                            Stats par page
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {marketingByPageLoading ? (
                            <Skeleton className="h-[200px] w-full" />
                          ) : marketingByPage.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">Aucune donnée</p>
                          ) : (
                            <div className="overflow-x-auto max-h-[200px]">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Page</TableHead>
                                    <TableHead className="text-right">Vues</TableHead>
                                    <TableHead className="text-right">CTA</TableHead>
                                    <TableHead className="text-right">Simul.</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {marketingByPage.map((page) => (
                                    <TableRow key={page.page}>
                                      <TableCell className="font-medium text-xs">{page.page}</TableCell>
                                      <TableCell className="text-right">{formatNumber(page.views)}</TableCell>
                                      <TableCell className="text-right">{formatNumber(page.cta_clicks)}</TableCell>
                                      <TableCell className="text-right">{formatNumber(page.simulations)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </CardContent>
                      </DraggableStatsSection>
                    );

                  default:
                    return null;
                }
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Draggable sections */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSectionDragEnd}
      >
        <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {sectionOrder.map((sectionId) => {
              switch (sectionId) {
                case 'main-stats':
                  return (
                    <DraggableStatsSection key={sectionId} id={sectionId} isCard={false}>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 [&>*:last-child:nth-child(2n+1)]:col-span-2 md:[&>*:last-child:nth-child(3n+1)]:col-span-3 md:[&>*:last-child:nth-child(3n+2)]:col-span-2 lg:[&>*:last-child:nth-child(6n+1)]:col-span-6 lg:[&>*:last-child:nth-child(6n+2)]:col-span-5 lg:[&>*:last-child:nth-child(6n+3)]:col-span-4 lg:[&>*:last-child:nth-child(6n+4)]:col-span-3 lg:[&>*:last-child:nth-child(6n+5)]:col-span-2">
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

                        {/* Total tours */}
                        <Card className="bg-gradient-to-br from-teal-500/10 to-teal-600/5 border-teal-500/20">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Map className="w-5 h-5 text-teal-500" />
                              <span className="text-xs text-muted-foreground">Tournées</span>
                            </div>
                            {toursCountLoading ? (
                              <Skeleton className="h-8 w-16" />
                            ) : (
                              <>
                                <p className="text-2xl font-bold text-teal-600">{formatNumber(totalToursCount)}</p>
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
                        <Card>
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

                        {/* Google Takeout Import Stats */}
                        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="w-5 h-5 text-orange-500" />
                              <span className="text-xs text-muted-foreground">Imports Google Maps</span>
                            </div>
                            {takeoutImportStatsLoading ? (
                              <Skeleton className="h-8 w-16" />
                            ) : (
                              <>
                                <p className="text-2xl font-bold text-orange-600">{takeoutImportStats?.successful_imports || 0}</p>
                                <p className="text-xs text-muted-foreground">réussis • {takeoutImportStats?.total_attempts || 0} tentatives</p>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </DraggableStatsSection>
                  );

                case 'recent-signups':
                  return (
                    <DraggableStatsSection key={sectionId} id={sectionId}>
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
                    </DraggableStatsSection>
                  );

                case 'download-stats':
                  return (
                    <DraggableStatsSection key={sectionId} id={sectionId}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Download className="w-5 h-5 text-primary" />
                          Téléchargement de l'application
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {downloadStatsLoading ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 [&>*:last-child:nth-child(2n+1)]:col-span-2 md:[&>*:last-child:nth-child(4n+1)]:col-span-4 md:[&>*:last-child:nth-child(4n+2)]:col-span-3 md:[&>*:last-child:nth-child(4n+3)]:col-span-2">
                            <Skeleton className="h-16" />
                            <Skeleton className="h-16" />
                            <Skeleton className="h-16" />
                            <Skeleton className="h-16" />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 [&>*:last-child:nth-child(2n+1)]:col-span-2 md:[&>*:last-child:nth-child(4n+1)]:col-span-4 md:[&>*:last-child:nth-child(4n+2)]:col-span-3 md:[&>*:last-child:nth-child(4n+3)]:col-span-2">
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
                    </DraggableStatsSection>
                  );

                case 'share-stats':
                  return (
                    <DraggableStatsSection key={sectionId} id={sectionId}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Share2 className="w-5 h-5 text-primary" />
                          Partages de l'application
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {shareStatsLoading ? (
                          <div className="grid grid-cols-3 gap-4 [&>*:last-child:nth-child(3n+1)]:col-span-3 [&>*:last-child:nth-child(3n+2)]:col-span-2">
                            <Skeleton className="h-16" />
                            <Skeleton className="h-16" />
                            <Skeleton className="h-16" />
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-4 mb-2 [&>*:last-child:nth-child(2n+1)]:col-span-2">
                              <div className="text-center p-3 bg-muted/50 rounded-lg">
                                <p className="text-2xl font-bold text-primary">{shareStats?.total_shares || 0}</p>
                                <p className="text-xs text-muted-foreground">Partages totaux</p>
                              </div>
                              <div className="text-center p-3 bg-muted/50 rounded-lg">
                                <p className="text-2xl font-bold text-green-500">{shareStats?.pct_users_shared || 0}%</p>
                                <p className="text-xs text-muted-foreground">Utilisateurs ayant partagé</p>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">sur les 30 derniers jours</p>
                          </>
                        )}
                      </CardContent>
                    </DraggableStatsSection>
                  );

                case 'comparison-chart':
                  return (
                    <DraggableStatsSection key={sectionId} id={sectionId}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-primary" />
                          Évolution sur 5 mois
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {monthlyStatsLoading ? (
                          <Skeleton className="h-[280px] w-full" />
                        ) : monthlyStats.length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">Aucune donnée</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={monthlyStats}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis 
                                dataKey="month" 
                                tick={{ fontSize: 11 }} 
                                tickLine={false} 
                                axisLine={false}
                              />
                              <YAxis 
                                yAxisId="left"
                                tick={{ fontSize: 10 }} 
                                tickLine={false} 
                                axisLine={false}
                                allowDecimals={false}
                              />
                              <YAxis 
                                yAxisId="right"
                                orientation="right"
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
                                formatter={(value: number, name: string) => {
                                  const labels: Record<string, string> = {
                                    users: 'Utilisateurs actifs',
                                    trips: 'Trajets',
                                    km: 'Distance (km)',
                                    ik: 'IK (€)',
                                  };
                                  return [new Intl.NumberFormat('fr-FR').format(value), labels[name] || name];
                                }}
                              />
                              <Legend 
                                formatter={(value) => {
                                  const labels: Record<string, string> = {
                                    users: 'Utilisateurs',
                                    trips: 'Trajets',
                                    km: 'Km',
                                    ik: 'IK (€)',
                                  };
                                  return labels[value] || value;
                                }}
                              />
                              <Line 
                                yAxisId="left"
                                type="monotone" 
                                dataKey="users" 
                                stroke="hsl(var(--primary))" 
                                strokeWidth={2}
                                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                              <Line 
                                yAxisId="left"
                                type="monotone" 
                                dataKey="trips" 
                                stroke="hsl(142, 76%, 36%)" 
                                strokeWidth={2}
                                dot={{ fill: 'hsl(142, 76%, 36%)', strokeWidth: 0, r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                              <Line 
                                yAxisId="right"
                                type="monotone" 
                                dataKey="ik" 
                                stroke="hsl(45, 93%, 47%)" 
                                strokeWidth={2}
                                dot={{ fill: 'hsl(45, 93%, 47%)', strokeWidth: 0, r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </DraggableStatsSection>
                  );

                case 'registrations-chart':
                  return (
                    <DraggableStatsSection key={sectionId} id={sectionId}>
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
                    </DraggableStatsSection>
                  );

                case 'top-users':
                  return (
                    <DraggableStatsSection key={sectionId} id={sectionId}>
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
                    </DraggableStatsSection>
                  );

                default:
                  return null;
              }
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
