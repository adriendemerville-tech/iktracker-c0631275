import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Server,
  Monitor,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Info,
} from 'lucide-react';

interface ErrorLog {
  id: string;
  created_at: string;
  source: 'backend' | 'frontend';
  error_type: string;
  message: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  user_id: string | null;
  resolved: boolean;
  resolved_at: string | null;
}

const ERROR_TYPE_INFO: Record<string, { icon: typeof AlertTriangle; color: string; label: string; explanation: string }> = {
  // Backend errors
  'rls_violation': {
    icon: XCircle,
    color: 'text-destructive',
    label: 'Violation RLS',
    explanation: 'Une opération en base de données a été bloquée par les règles de sécurité (Row Level Security). Cela signifie qu\'un utilisateur a tenté d\'accéder à des données qui ne lui appartiennent pas.',
  },
  'edge_function_error': {
    icon: Server,
    color: 'text-destructive',
    label: 'Erreur Edge Function',
    explanation: 'Une fonction serveur (Edge Function) a rencontré une erreur pendant son exécution. Cela peut être dû à un timeout, une API externe indisponible, ou un bug dans le code.',
  },
  'db_constraint': {
    icon: AlertTriangle,
    color: 'text-warning',
    label: 'Contrainte DB',
    explanation: 'Une insertion ou modification en base a violé une contrainte (unicité, clé étrangère, format). Les données envoyées ne respectent pas le schéma attendu.',
  },
  'auth_error': {
    icon: AlertTriangle,
    color: 'text-warning',
    label: 'Erreur Auth',
    explanation: 'Un problème d\'authentification : token expiré, session invalide, ou tentative d\'accès non autorisée. L\'utilisateur doit se reconnecter.',
  },
  'timeout': {
    icon: Clock,
    color: 'text-warning',
    label: 'Timeout',
    explanation: 'Une opération a dépassé le délai maximum autorisé. Cela peut indiquer une requête trop lourde, un service externe lent, ou un problème réseau.',
  },
  // Frontend errors
  'js_error': {
    icon: XCircle,
    color: 'text-destructive',
    label: 'Erreur JS',
    explanation: 'Une erreur JavaScript non interceptée s\'est produite dans le navigateur du client. Cela provoque généralement un écran blanc ou un composant qui ne s\'affiche pas.',
  },
  'network_error': {
    icon: AlertTriangle,
    color: 'text-warning',
    label: 'Erreur Réseau',
    explanation: 'Le client n\'a pas pu communiquer avec le serveur. Causes possibles : perte de connexion internet, serveur indisponible, ou requête bloquée par un pare-feu.',
  },
  'api_error': {
    icon: AlertTriangle,
    color: 'text-warning',
    label: 'Erreur API',
    explanation: 'L\'appel à une API a retourné une réponse inattendue (erreur 4xx/5xx). Le client a reçu une réponse d\'erreur du serveur.',
  },
  'gps_error': {
    icon: Info,
    color: 'text-muted-foreground',
    label: 'Erreur GPS',
    explanation: 'La géolocalisation a échoué ou été refusée par l\'utilisateur. Le mode tournée ne peut pas fonctionner sans accès à la position GPS.',
  },
  'storage_error': {
    icon: AlertTriangle,
    color: 'text-warning',
    label: 'Erreur Stockage',
    explanation: 'Échec de lecture/écriture dans le localStorage ou le stockage du navigateur. Cela peut empêcher la sauvegarde des préférences ou la récupération de session.',
  },
  'unknown': {
    icon: Info,
    color: 'text-muted-foreground',
    label: 'Autre',
    explanation: 'Erreur non catégorisée. Consultez le message et les métadonnées pour plus de détails.',
  },
};

function getErrorInfo(errorType: string) {
  return ERROR_TYPE_INFO[errorType] || ERROR_TYPE_INFO['unknown'];
}

function ErrorCard({ error, onResolve }: { error: ErrorLog; onResolve: (id: string) => void }) {
  const info = getErrorInfo(error.error_type);
  const Icon = info.icon;
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Card className={`transition-all ${error.resolved ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${info.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">{info.label}</Badge>
              {error.resolved ? (
                <Badge variant="secondary" className="text-xs gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Résolu
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">Actif</Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {format(new Date(error.created_at), 'dd MMM HH:mm', { locale: fr })}
              </span>
            </div>

            <p className="text-sm font-medium truncate">{error.message}</p>

            {/* Pedagogical description */}
            <div className="bg-muted/50 rounded-md p-2 mt-1">
              <p className="text-xs text-muted-foreground leading-relaxed">
                💡 {error.description || info.explanation}
              </p>
            </div>

            {error.user_id && (
              <p className="text-xs text-muted-foreground">
                Utilisateur : <code className="bg-muted px-1 rounded text-[10px]">{error.user_id.slice(0, 8)}…</code>
              </p>
            )}

            {error.metadata && Object.keys(error.metadata).length > 0 && (
              <>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-primary hover:underline"
                >
                  {showDetails ? 'Masquer' : 'Voir'} les détails
                </button>
                {showDetails && (
                  <pre className="text-[10px] bg-muted p-2 rounded-md overflow-x-auto max-h-32">
                    {JSON.stringify(error.metadata, null, 2)}
                  </pre>
                )}
              </>
            )}
          </div>

          {!error.resolved && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => onResolve(error.id)}
              title="Marquer comme résolu"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminMonitoring() {
  const [tab, setTab] = useState<'backend' | 'frontend'>('backend');
  const [showResolved, setShowResolved] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: errors = [], isLoading } = useQuery({
    queryKey: ['admin-error-logs', tab, showResolved],
    queryFn: async () => {
      let query = supabase
        .from('error_logs')
        .select('*')
        .eq('source', tab)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!showResolved) {
        query = query.eq('resolved', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ErrorLog[];
    },
    refetchInterval: 60_000,
  });

  const resolveMutation = useMutation({
    mutationFn: async (errorId: string) => {
      const { error } = await supabase
        .from('error_logs')
        .update({ resolved: true, resolved_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', errorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-error-logs'] });
      toast({ title: 'Erreur marquée comme résolue' });
    },
  });

  const backendCount = useQuery({
    queryKey: ['admin-error-count-backend'],
    queryFn: async () => {
      const { count } = await supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('source', 'backend')
        .eq('resolved', false);
      return count || 0;
    },
    refetchInterval: 60_000,
  });

  const frontendCount = useQuery({
    queryKey: ['admin-error-count-frontend'],
    queryFn: async () => {
      const { count } = await supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('source', 'frontend')
        .eq('resolved', false);
      return count || 0;
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Monitoring des erreurs</CardTitle>
              <CardDescription>
                Suivi des erreurs backend (serveur, BDD, auth) et frontend (JS, réseau, GPS)
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['admin-error-logs'] });
                queryClient.invalidateQueries({ queryKey: ['admin-error-count-backend'] });
                queryClient.invalidateQueries({ queryKey: ['admin-error-count-frontend'] });
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'backend' | 'frontend')}>
            <div className="flex items-center gap-3 mb-4">
              <TabsList>
                <TabsTrigger value="backend" className="gap-2">
                  <Server className="w-4 h-4" />
                  Backend
                  {(backendCount.data ?? 0) > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] text-[10px]">
                      {backendCount.data}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="frontend" className="gap-2">
                  <Monitor className="w-4 h-4" />
                  Frontend
                  {(frontendCount.data ?? 0) > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] text-[10px]">
                      {frontendCount.data}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <label className="flex items-center gap-2 text-xs text-muted-foreground ml-auto cursor-pointer">
                <input
                  type="checkbox"
                  checked={showResolved}
                  onChange={(e) => setShowResolved(e.target.checked)}
                  className="rounded"
                />
                Afficher les résolus
              </label>
            </div>

            <TabsContent value="backend" className="mt-0">
              <ErrorList errors={errors} isLoading={isLoading} onResolve={(id) => resolveMutation.mutate(id)} source="backend" />
            </TabsContent>
            <TabsContent value="frontend" className="mt-0">
              <ErrorList errors={errors} isLoading={isLoading} onResolve={(id) => resolveMutation.mutate(id)} source="frontend" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Légende des types d'erreurs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(ERROR_TYPE_INFO)
              .filter(([key]) => key !== 'unknown')
              .map(([key, info]) => {
                const Icon = info.icon;
                return (
                  <div key={key} className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${info.color}`} />
                    <div>
                      <p className="text-xs font-medium">{info.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{info.explanation}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorList({
  errors,
  isLoading,
  onResolve,
  source,
}: {
  errors: ErrorLog[];
  isLoading: boolean;
  onResolve: (id: string) => void;
  source: string;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (errors.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500 opacity-50" />
        <p className="font-medium">Aucune erreur {source === 'backend' ? 'serveur' : 'client'}</p>
        <p className="text-xs mt-1">Tout fonctionne normalement 🎉</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[600px]">
      <div className="space-y-3 pr-2">
        {errors.map((error) => (
          <ErrorCard key={error.id} error={error} onResolve={onResolve} />
        ))}
      </div>
    </ScrollArea>
  );
}
