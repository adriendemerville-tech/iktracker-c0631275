import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Zap,
  Hash,
  Euro,
  TrendingUp,
  ArrowDownUp,
  RefreshCw,
  Calendar,
} from 'lucide-react';

type PeriodFilter = '7' | '30' | '90' | 'all';

interface CostStats {
  total_requests: number;
  total_tokens_input: number;
  total_tokens_output: number;
  total_cost: number;
  period_requests: number;
  period_tokens_input: number;
  period_tokens_output: number;
  period_cost: number;
}

interface FunctionCost {
  function_name: string;
  request_count: number;
  tokens_in: number;
  tokens_out: number;
  cost: number;
}

interface DailyCost {
  day: string;
  request_count: number;
  tokens: number;
  cost: number;
}

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  '7': '7 jours',
  '30': '30 jours',
  '90': '90 jours',
  'all': 'Tout',
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return n.toLocaleString('fr-FR');
}

function formatCost(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + ' €';
}

export function AdminCosts() {
  const [period, setPeriod] = useState<PeriodFilter>('30');
  const daysBack = period === 'all' ? 3650 : parseInt(period);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['admin-cost-stats', daysBack],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_api_cost_stats', { days_back: daysBack });
      if (error) throw error;
      return data as unknown as CostStats;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: byFunction = [], isLoading: fnLoading } = useQuery({
    queryKey: ['admin-cost-by-function', daysBack],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_api_cost_by_function', { days_back: daysBack });
      if (error) throw error;
      return data as unknown as FunctionCost[];
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: byDay = [], isLoading: dayLoading } = useQuery({
    queryKey: ['admin-cost-by-day', daysBack],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_api_cost_by_day', { days_back: daysBack });
      if (error) throw error;
      return data as unknown as DailyCost[];
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const handleRefresh = () => {
    refetchStats();
  };

  const isLoading = statsLoading || fnLoading || dayLoading;

  return (
    <div className="space-y-6">
      {/* Period filter + refresh */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod(p)}
              className="text-xs h-7 px-3"
            >
              {PERIOD_LABELS[p]}
            </Button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </Button>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : stats ? (
        <>
          {/* Period stats */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Période : {PERIOD_LABELS[period]}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <CostCard
                icon={<Hash className="w-5 h-5 text-primary" />}
                label="Requêtes API"
                value={formatNumber(stats.period_requests)}
                badge={null}
              />
              <CostCard
                icon={<Zap className="w-5 h-5 text-amber-500" />}
                label="Tokens IN"
                value={formatNumber(stats.period_tokens_input)}
                badge={null}
              />
              <CostCard
                icon={<ArrowDownUp className="w-5 h-5 text-blue-500" />}
                label="Tokens OUT"
                value={formatNumber(stats.period_tokens_output)}
                badge={null}
              />
              <CostCard
                icon={<Euro className="w-5 h-5 text-emerald-500" />}
                label="Coût période"
                value={formatCost(stats.period_cost)}
                highlight
                badge={null}
              />
            </div>
          </div>

          {/* Total stats */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Totaux (tout temps)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <CostCard
                icon={<Hash className="w-5 h-5 text-muted-foreground" />}
                label="Total requêtes"
                value={formatNumber(stats.total_requests)}
                badge={null}
                muted
              />
              <CostCard
                icon={<Zap className="w-5 h-5 text-muted-foreground" />}
                label="Total tokens IN"
                value={formatNumber(stats.total_tokens_input)}
                badge={null}
                muted
              />
              <CostCard
                icon={<ArrowDownUp className="w-5 h-5 text-muted-foreground" />}
                label="Total tokens OUT"
                value={formatNumber(stats.total_tokens_output)}
                badge={null}
                muted
              />
              <CostCard
                icon={<Euro className="w-5 h-5 text-emerald-600" />}
                label="Coût total"
                value={formatCost(stats.total_cost)}
                highlight
                badge={
                  stats.total_cost > 0 ? (
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600">
                      Cumulé
                    </Badge>
                  ) : null
                }
              />
            </div>
          </div>
        </>
      ) : null}

      {/* Cost by function */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Coût par fonction
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fnLoading ? (
            <Skeleton className="h-32" />
          ) : byFunction.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucune donnée d'utilisation pour cette période
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fonction</TableHead>
                    <TableHead className="text-right">Requêtes</TableHead>
                    <TableHead className="text-right">Tokens IN</TableHead>
                    <TableHead className="text-right">Tokens OUT</TableHead>
                    <TableHead className="text-right">Coût</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byFunction.map((fn) => (
                    <TableRow key={fn.function_name}>
                      <TableCell className="font-mono text-xs">{fn.function_name}</TableCell>
                      <TableCell className="text-right">{formatNumber(fn.request_count)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatNumber(fn.tokens_in)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatNumber(fn.tokens_out)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCost(fn.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily breakdown (last entries) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Coût par jour
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dayLoading ? (
            <Skeleton className="h-32" />
          ) : byDay.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucune donnée pour cette période
            </p>
          ) : (
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Requêtes</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Coût</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byDay
                    .filter(d => d.request_count > 0)
                    .reverse()
                    .map((d) => (
                      <TableRow key={d.day}>
                        <TableCell className="text-sm">
                          {new Date(d.day).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(d.request_count)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatNumber(d.tokens)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCost(d.cost)}</TableCell>
                      </TableRow>
                    ))}
                  {byDay.filter(d => d.request_count > 0).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        Aucune activité sur cette période
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CostCard({
  icon,
  label,
  value,
  badge,
  highlight,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge: React.ReactNode;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <Card className={muted ? 'bg-muted/30' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          {icon}
          {badge}
        </div>
        <p className={`text-2xl font-bold tabular-nums ${highlight ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}
