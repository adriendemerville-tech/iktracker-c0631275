import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, Code2, Globe, Settings, Trash2, PlusCircle, 
  Edit, Image, Search 
} from 'lucide-react';

interface AuditLog {
  action: string;
  resource_type: string;
}

interface CounterDef {
  label: string;
  icon: typeof FileText;
  color: string;
  match: (log: AuditLog) => boolean;
}

const COUNTERS: CounterDef[] = [
  { 
    label: 'Modif. contenu', 
    icon: Edit, 
    color: 'bg-blue-500/15 text-blue-600 border-blue-500/20',
    match: (l) => l.action === 'update' && l.resource_type === 'post',
  },
  { 
    label: 'Ajout contenu', 
    icon: PlusCircle, 
    color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20',
    match: (l) => l.action === 'create' && l.resource_type === 'post',
  },
  { 
    label: 'Modif. code', 
    icon: Code2, 
    color: 'bg-violet-500/15 text-violet-600 border-violet-500/20',
    match: (l) => l.action === 'update' && l.resource_type === 'injection',
  },
  { 
    label: 'Ajout code', 
    icon: Code2, 
    color: 'bg-purple-500/15 text-purple-600 border-purple-500/20',
    match: (l) => l.action === 'create' && l.resource_type === 'injection',
  },
  { 
    label: 'Création page', 
    icon: Globe, 
    color: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/20',
    match: (l) => l.action === 'create' && l.resource_type === 'page',
  },
  { 
    label: 'Modif. page', 
    icon: FileText, 
    color: 'bg-sky-500/15 text-sky-600 border-sky-500/20',
    match: (l) => l.action === 'update' && l.resource_type === 'page',
  },
  { 
    label: 'Suppression', 
    icon: Trash2, 
    color: 'bg-red-500/15 text-red-600 border-red-500/20',
    match: (l) => l.action === 'delete',
  },
  { 
    label: 'SEO', 
    icon: Search, 
    color: 'bg-amber-500/15 text-amber-600 border-amber-500/20',
    match: (l) => l.resource_type === 'seo' || l.resource_type === 'seo_config',
  },
  { 
    label: 'Config', 
    icon: Settings, 
    color: 'bg-slate-500/15 text-slate-600 border-slate-500/20',
    match: (l) => l.resource_type === 'config' || l.resource_type === 'site_config',
  },
  { 
    label: 'Média', 
    icon: Image, 
    color: 'bg-pink-500/15 text-pink-600 border-pink-500/20',
    match: (l) => l.resource_type === 'media',
  },
];

interface AutopilotCountersProps {
  auditLogs: AuditLog[];
}

export function AutopilotCounters({ auditLogs }: AutopilotCountersProps) {
  const counts = useMemo(() => {
    return COUNTERS.map(c => ({
      ...c,
      count: auditLogs.filter(c.match).length,
    }));
  }, [auditLogs]);

  const totalActions = auditLogs.length;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground">Activité Crawlers</span>
        <Badge variant="outline" className="text-[10px] h-5">
          {totalActions} actions
        </Badge>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {counts.filter(c => c.count > 0).map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${c.color}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{c.label}</span>
              <span className="ml-auto font-bold text-sm">{c.count}</span>
            </div>
          );
        })}
        {counts.every(c => c.count === 0) && (
          <span className="text-xs text-muted-foreground col-span-full">Aucune activité enregistrée</span>
        )}
      </div>
    </div>
  );
}
