import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { PERSONA_OPTIONS } from '@/components/PersonaPicker';
import {
  Plus, Trash2, Edit, BarChart3, Eye, Send, Copy,
  Star, MessageSquare, Camera, Share2, ListChecks,
  ChevronDown, ChevronUp, Loader2, ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ---- Types ----

interface ContentBlock {
  id: string;
  type: 'poll' | 'rating' | 'text_question' | 'screenshot' | 'share';
  config: Record<string, unknown>;
}

interface SurveyVariant {
  id: string;
  survey_id: string;
  name: string;
  distribution_pct: number;
  content_blocks: ContentBlock[];
  created_at: string;
  updated_at: string;
}

interface Survey {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  status: string;
  published_at: string | null;
  target_page: string;
  duration_days: number;
  max_impressions_per_user: number;
  delay_between_impressions_hours: number;
  target_personas: string[];
  target_user_count: number | null;
  target_min_days_since_signup: number | null;
  target_max_days_since_signup: number | null;
  created_by: string | null;
}

interface SurveyStats {
  survey_id: string;
  total_shown: number;
  total_dismissed: number;
  total_completed: number;
  total_responses: number;
  unique_users_shown: number;
  unique_users_responded: number;
}

const CONTENT_BLOCK_TYPES = [
  { value: 'poll', label: 'Sondage', icon: ListChecks },
  { value: 'rating', label: 'Note sur 5', icon: Star },
  { value: 'text_question', label: 'Question ouverte', icon: MessageSquare },
  { value: 'screenshot', label: 'Capture d\'écran', icon: Camera },
  { value: 'share', label: 'Partage', icon: Share2 },
] as const;

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'outline' },
  published: { label: 'Publié', variant: 'default' },
  paused: { label: 'Pausé', variant: 'secondary' },
  completed: { label: 'Terminé', variant: 'destructive' },
};

const PAGE_OPTIONS = [
  '/app', '/mestrajets', '/profile', '/calendrier', '/mode-tournee',
];

// ---- Helpers ----

function generateId() {
  return crypto.randomUUID();
}

function defaultContentBlock(type: ContentBlock['type']): ContentBlock {
  const base = { id: generateId(), type, config: {} };
  switch (type) {
    case 'poll':
      return { ...base, config: { question: '', options: ['', ''] } };
    case 'rating':
      return { ...base, config: { question: 'Comment évaluez-vous IKtracker ?' } };
    case 'text_question':
      return { ...base, config: { question: '', placeholder: 'Votre réponse...' } };
    case 'screenshot':
      return { ...base, config: { prompt: 'Partagez une capture d\'écran pour nous aider à améliorer l\'app' } };
    case 'share':
      return { ...base, config: { message: 'Découvre IKtracker pour suivre tes indemnités kilométriques !', channels: ['whatsapp', 'sms'] } };
    default:
      return base;
  }
}

// ---- Sub-components ----

function ContentBlockEditor({ block, onChange, onRemove }: {
  block: ContentBlock;
  onChange: (block: ContentBlock) => void;
  onRemove: () => void;
}) {
  const meta = CONTENT_BLOCK_TYPES.find(t => t.value === block.type);
  const Icon = meta?.icon || ListChecks;

  return (
    <Card className="border-dashed">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{meta?.label}</span>
            <span title="Visible par l'utilisateur"><Eye className="w-3.5 h-3.5 text-green-500" /></span>
          </div>
          <Button variant="ghost" size="icon" onClick={onRemove} className="h-7 w-7">
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        {block.type === 'poll' && (
          <>
            <div>
              <Label className="text-xs">Question</Label>
              <Input
                value={(block.config.question as string) || ''}
                onChange={e => onChange({ ...block, config: { ...block.config, question: e.target.value } })}
                placeholder="Votre question..."
              />
            </div>
            <div>
              <Label className="text-xs">Options</Label>
              {((block.config.options as string[]) || []).map((opt, i) => (
                <div key={i} className="flex gap-2 mt-1">
                  <Input
                    value={opt}
                    onChange={e => {
                      const opts = [...(block.config.options as string[])];
                      opts[i] = e.target.value;
                      onChange({ ...block, config: { ...block.config, options: opts } });
                    }}
                    placeholder={`Option ${i + 1}`}
                  />
                  {((block.config.options as string[]).length > 2) && (
                    <Button variant="ghost" size="icon" className="h-12 w-10 shrink-0" onClick={() => {
                      const opts = (block.config.options as string[]).filter((_, j) => j !== i);
                      onChange({ ...block, config: { ...block.config, options: opts } });
                    }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" className="mt-2" onClick={() => {
                const opts = [...(block.config.options as string[]), ''];
                onChange({ ...block, config: { ...block.config, options: opts } });
              }}>
                <Plus className="w-3 h-3 mr-1" /> Option
              </Button>
            </div>
          </>
        )}
        {block.type === 'rating' && (
          <div>
            <Label className="text-xs">Question</Label>
            <Input
              value={(block.config.question as string) || ''}
              onChange={e => onChange({ ...block, config: { ...block.config, question: e.target.value } })}
              placeholder="Comment évaluez-vous... ?"
            />
          </div>
        )}
        {block.type === 'text_question' && (
          <>
            <div>
              <Label className="text-xs">Question</Label>
              <Input
                value={(block.config.question as string) || ''}
                onChange={e => onChange({ ...block, config: { ...block.config, question: e.target.value } })}
                placeholder="Votre question..."
              />
            </div>
            <div>
              <Label className="text-xs">Placeholder</Label>
              <Input
                value={(block.config.placeholder as string) || ''}
                onChange={e => onChange({ ...block, config: { ...block.config, placeholder: e.target.value } })}
              />
            </div>
          </>
        )}
        {block.type === 'screenshot' && (
          <div>
            <Label className="text-xs">Message d'invitation</Label>
            <Textarea
              value={(block.config.prompt as string) || ''}
              onChange={e => onChange({ ...block, config: { ...block.config, prompt: e.target.value } })}
              rows={2}
            />
          </div>
        )}
        {block.type === 'share' && (
          <>
            <div>
              <Label className="text-xs">Message pré-rempli</Label>
              <Textarea
                value={(block.config.message as string) || ''}
                onChange={e => onChange({ ...block, config: { ...block.config, message: e.target.value } })}
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              {['whatsapp', 'sms'].map(ch => (
                <label key={ch} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={((block.config.channels as string[]) || []).includes(ch)}
                    onCheckedChange={checked => {
                      const channels = (block.config.channels as string[]) || [];
                      const next = checked ? [...channels, ch] : channels.filter(c => c !== ch);
                      onChange({ ...block, config: { ...block.config, channels: next } });
                    }}
                  />
                  {ch === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                </label>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function VariantEditor({ variant, onChange, onRemove, canRemove }: {
  variant: SurveyVariant;
  onChange: (v: SurveyVariant) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card>
      <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <Input
              value={variant.name}
              onClick={e => e.stopPropagation()}
              onChange={e => onChange({ ...variant, name: e.target.value })}
              className="h-8 w-40 text-sm font-medium"
            />
            <Badge variant="outline">{variant.distribution_pct}%</Badge>
          </div>
          {canRemove && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onRemove(); }}>
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="px-4 pb-4 pt-0 space-y-4">
          <div>
            <Label className="text-xs">Répartition (%)</Label>
            <Slider
              value={[variant.distribution_pct]}
              onValueChange={([v]) => onChange({ ...variant, distribution_pct: v })}
              min={0} max={100} step={5}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-xs font-semibold">Blocs de contenu</Label>
            {(variant.content_blocks || []).map((block, i) => (
              <ContentBlockEditor
                key={block.id}
                block={block}
                onChange={updated => {
                  const blocks = [...variant.content_blocks];
                  blocks[i] = updated;
                  onChange({ ...variant, content_blocks: blocks });
                }}
                onRemove={() => {
                  onChange({ ...variant, content_blocks: variant.content_blocks.filter((_, j) => j !== i) });
                }}
              />
            ))}
            <Select onValueChange={type => {
              onChange({
                ...variant,
                content_blocks: [...variant.content_blocks, defaultContentBlock(type as ContentBlock['type'])],
              });
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="+ Ajouter un bloc" />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_BLOCK_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">
                      <t.icon className="w-4 h-4" /> {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ---- Main component ----

export function AdminSurveys() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [editingVariants, setEditingVariants] = useState<SurveyVariant[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Form state for new/edit
  const [form, setForm] = useState({
    title: '',
    description: '',
    target_page: '/app',
    duration_days: 7,
    max_impressions_per_user: 3,
    delay_between_impressions_hours: 24,
    target_personas: [] as string[],
    target_user_count: null as number | null,
    target_min_days_since_signup: null as number | null,
    target_max_days_since_signup: null as number | null,
  });

  // ---- Queries ----

  const { data: surveys = [], isLoading: surveysLoading } = useQuery({
    queryKey: ['admin-surveys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Survey[];
    },
  });

  const { data: allStats = [] } = useQuery({
    queryKey: ['admin-survey-stats'],
    queryFn: async () => {
      const stats: SurveyStats[] = [];
      for (const s of surveys) {
        const { data: impressions } = await supabase
          .from('survey_impressions')
          .select('action, user_id')
          .eq('survey_id', s.id);

        const { data: responses } = await supabase
          .from('survey_responses')
          .select('user_id, completed')
          .eq('survey_id', s.id);

        const imp = impressions || [];
        const resp = responses || [];

        stats.push({
          survey_id: s.id,
          total_shown: imp.filter(i => i.action === 'shown').length,
          total_dismissed: imp.filter(i => i.action === 'dismissed').length,
          total_completed: imp.filter(i => i.action === 'completed').length,
          total_responses: resp.length,
          unique_users_shown: new Set(imp.filter(i => i.action === 'shown').map(i => i.user_id)).size,
          unique_users_responded: new Set(resp.map(r => r.user_id)).size,
        });
      }
      return stats;
    },
    enabled: surveys.length > 0,
  });

  // ---- Mutations ----

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingSurvey) {
        // Update
        const { error } = await supabase
          .from('surveys')
          .update({
            title: form.title,
            description: form.description || null,
            target_page: form.target_page,
            duration_days: form.duration_days,
            max_impressions_per_user: form.max_impressions_per_user,
            delay_between_impressions_hours: form.delay_between_impressions_hours,
            target_personas: form.target_personas,
            target_user_count: form.target_user_count,
            target_min_days_since_signup: form.target_min_days_since_signup,
            target_max_days_since_signup: form.target_max_days_since_signup,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', editingSurvey.id);
        if (error) throw error;

        // Upsert variants
        for (const v of editingVariants) {
          if (v.id.startsWith('new-')) {
            const { error: vErr } = await supabase.from('survey_variants').insert({
              survey_id: editingSurvey.id,
              name: v.name,
              distribution_pct: v.distribution_pct,
              content_blocks: v.content_blocks as any,
            } as any);
            if (vErr) throw vErr;
          } else {
            const { error: vErr } = await supabase.from('survey_variants').update({
              name: v.name,
              distribution_pct: v.distribution_pct,
              content_blocks: v.content_blocks as any,
              updated_at: new Date().toISOString(),
            } as any).eq('id', v.id);
            if (vErr) throw vErr;
          }
        }
      } else {
        // Create
        const { data: newSurvey, error } = await supabase
          .from('surveys')
          .insert({
            title: form.title,
            description: form.description || null,
            target_page: form.target_page,
            duration_days: form.duration_days,
            max_impressions_per_user: form.max_impressions_per_user,
            delay_between_impressions_hours: form.delay_between_impressions_hours,
            target_personas: form.target_personas,
            target_user_count: form.target_user_count,
            target_min_days_since_signup: form.target_min_days_since_signup,
            target_max_days_since_signup: form.target_max_days_since_signup,
          } as any)
          .select()
          .single();
        if (error) throw error;

        for (const v of editingVariants) {
          const { error: vErr } = await supabase.from('survey_variants').insert({
            survey_id: (newSurvey as any).id,
            name: v.name,
            distribution_pct: v.distribution_pct,
            content_blocks: v.content_blocks as any,
          } as any);
          if (vErr) throw vErr;
        }
      }
    },
    onSuccess: () => {
      toast({ title: editingSurvey ? 'Survey mis à jour' : 'Survey créé' });
      queryClient.invalidateQueries({ queryKey: ['admin-surveys'] });
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (surveyId: string) => {
      const { error } = await supabase
        .from('surveys')
        .update({ status: 'published', published_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any)
        .eq('id', surveyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Survey publié !' });
      queryClient.invalidateQueries({ queryKey: ['admin-surveys'] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('surveys')
        .update({ status, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-surveys'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('surveys').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Survey supprimé' });
      queryClient.invalidateQueries({ queryKey: ['admin-surveys'] });
    },
  });

  // ---- Helpers ----

  function resetForm() {
    setEditingSurvey(null);
    setIsCreating(false);
    setForm({
      title: '', description: '', target_page: '/app',
      duration_days: 7, max_impressions_per_user: 3,
      delay_between_impressions_hours: 24,
      target_personas: [], target_user_count: null,
      target_min_days_since_signup: null, target_max_days_since_signup: null,
    });
    setEditingVariants([]);
  }

  async function startEditing(survey: Survey) {
    setEditingSurvey(survey);
    setIsCreating(true);
    setForm({
      title: survey.title,
      description: survey.description || '',
      target_page: survey.target_page,
      duration_days: survey.duration_days,
      max_impressions_per_user: survey.max_impressions_per_user,
      delay_between_impressions_hours: survey.delay_between_impressions_hours,
      target_personas: survey.target_personas || [],
      target_user_count: survey.target_user_count,
      target_min_days_since_signup: (survey as any).target_min_days_since_signup ?? null,
      target_max_days_since_signup: (survey as any).target_max_days_since_signup ?? null,
    });

    const { data } = await supabase
      .from('survey_variants')
      .select('*')
      .eq('survey_id', survey.id)
      .order('created_at');

    setEditingVariants((data || []).map(v => ({
      ...v,
      content_blocks: (v.content_blocks || []) as unknown as ContentBlock[],
    })) as SurveyVariant[]);
  }

  function startCreating() {
    resetForm();
    setIsCreating(true);
    setEditingVariants([{
      id: 'new-' + generateId(),
      survey_id: '',
      name: 'Variante A',
      distribution_pct: 100,
      content_blocks: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);
  }

  function addVariant() {
    const letter = String.fromCharCode(65 + editingVariants.length);
    const remaining = 100 - editingVariants.reduce((s, v) => s + v.distribution_pct, 0);
    setEditingVariants([...editingVariants, {
      id: 'new-' + generateId(),
      survey_id: editingSurvey?.id || '',
      name: `Variante ${letter}`,
      distribution_pct: Math.max(0, remaining),
      content_blocks: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);
  }

  function duplicateVariant(variant: SurveyVariant) {
    const letter = String.fromCharCode(65 + editingVariants.length);
    setEditingVariants([...editingVariants, {
      ...variant,
      id: 'new-' + generateId(),
      name: `Variante ${letter} (copie)`,
      distribution_pct: 0,
      content_blocks: variant.content_blocks.map(b => ({ ...b, id: generateId() })),
    }]);
  }

  // ---- Editor view ----
  if (isCreating) {
    const totalPct = editingVariants.reduce((s, v) => s + v.distribution_pct, 0);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={resetForm}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold">{editingSurvey ? 'Modifier le survey' : 'Nouveau survey'}</h2>
        </div>

        {/* General settings */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Paramètres généraux</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="flex items-center gap-1.5">Titre <span title="Visible par l'utilisateur"><Eye className="w-3.5 h-3.5 text-green-500" /></span></Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nom du survey" />
              </div>
              <div>
                <Label>Page cible</Label>
                <Select value={form.target_page} onValueChange={v => setForm(f => ({ ...f, target_page: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAGE_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-1.5">Description (interne) <span title="Non visible — admin uniquement"><Eye className="w-3.5 h-3.5 text-red-500" /></span></Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Durée (jours)</Label>
                <Input type="number" value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: parseInt(e.target.value) || 7 }))} />
              </div>
              <div>
                <Label>Max affichages/user</Label>
                <Input type="number" value={form.max_impressions_per_user} onChange={e => setForm(f => ({ ...f, max_impressions_per_user: parseInt(e.target.value) || 3 }))} />
              </div>
              <div>
                <Label>Délai entre affichages (h)</Label>
                <Input type="number" value={form.delay_between_impressions_hours} onChange={e => setForm(f => ({ ...f, delay_between_impressions_hours: parseInt(e.target.value) || 24 }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Nombre d'users ciblés</Label>
                <Input type="number" value={form.target_user_count ?? ''} onChange={e => setForm(f => ({ ...f, target_user_count: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Illimité" />
              </div>
              <div>
                <Label>Ancienneté min (jours)</Label>
                <Input type="number" value={form.target_min_days_since_signup ?? ''} onChange={e => setForm(f => ({ ...f, target_min_days_since_signup: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Pas de minimum" />
              </div>
              <div>
                <Label>Ancienneté max (jours)</Label>
                <Input type="number" value={form.target_max_days_since_signup ?? ''} onChange={e => setForm(f => ({ ...f, target_max_days_since_signup: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Pas de maximum" />
              </div>
              <div>
                <Label>Personas ciblés</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  <label className="flex items-center gap-1.5 text-xs font-medium">
                    <Checkbox
                      checked={form.target_personas.length === 0}
                      onCheckedChange={checked => {
                        if (checked) {
                          setForm(f => ({ ...f, target_personas: [] }));
                        }
                      }}
                    />
                    Toutes
                  </label>
                  {PERSONA_OPTIONS.map(p => (
                    <label key={p.value} className="flex items-center gap-1.5 text-xs">
                      <Checkbox
                        checked={form.target_personas.includes(p.value)}
                        onCheckedChange={checked => {
                          setForm(f => ({
                            ...f,
                            target_personas: checked
                              ? [...f.target_personas, p.value]
                              : f.target_personas.filter(v => v !== p.value),
                          }));
                        }}
                      />
                      {p.label.split('/')[0].trim()}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Variants */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Variantes A/B
                {totalPct !== 100 && <span className="ml-2 text-xs text-destructive">(total: {totalPct}% ≠ 100%)</span>}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={addVariant}>
                <Plus className="w-3 h-3 mr-1" /> Variante
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingVariants.map((v, i) => (
              <div key={v.id} className="space-y-2">
                <VariantEditor
                  variant={v}
                  onChange={updated => {
                    const variants = [...editingVariants];
                    variants[i] = updated;
                    setEditingVariants(variants);
                  }}
                  onRemove={() => setEditingVariants(editingVariants.filter((_, j) => j !== i))}
                  canRemove={editingVariants.length > 1}
                />
                <Button variant="ghost" size="sm" onClick={() => duplicateVariant(v)} className="text-xs">
                  <Copy className="w-3 h-3 mr-1" /> Dupliquer
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={resetForm}>Annuler</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!form.title.trim() || saveMutation.isPending || totalPct !== 100}>
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Enregistrer
          </Button>
          {editingSurvey && editingSurvey.status === 'draft' && (
            <Button variant="gradient" onClick={() => { saveMutation.mutate(); publishMutation.mutate(editingSurvey.id); }}>
              <Send className="w-4 h-4 mr-2" /> Publier
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ---- List view ----
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Surveys</h2>
        <Button onClick={startCreating}>
          <Plus className="w-4 h-4 mr-2" /> Nouveau survey
        </Button>
      </div>

      {surveysLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : surveys.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun survey créé</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-3">
            {surveys.map(survey => {
              const stats = allStats.find(s => s.survey_id === survey.id);
              const statusInfo = STATUS_LABELS[survey.status] || STATUS_LABELS.draft;
              const responseRate = stats && stats.unique_users_shown > 0
                ? Math.round((stats.unique_users_responded / stats.unique_users_shown) * 100)
                : 0;

              return (
                <Card key={survey.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm truncate">{survey.title}</h3>
                          <Badge variant={statusInfo.variant} className="text-[10px] shrink-0">
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Page : {survey.target_page} · {survey.duration_days}j · Max {survey.max_impressions_per_user} affichages
                        </p>
                        {survey.published_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Publié le {format(new Date(survey.published_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                          </p>
                        )}

                        {/* Stats */}
                        {stats && (
                          <div className="flex gap-4 mt-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Vus:</span>{' '}
                              <span className="font-medium">{stats.unique_users_shown}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Réponses:</span>{' '}
                              <span className="font-medium">{stats.unique_users_responded}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Taux:</span>{' '}
                              <span className="font-medium">{responseRate}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Fermés:</span>{' '}
                              <span className="font-medium">{stats.total_dismissed}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditing(survey)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        {survey.status === 'draft' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => publishMutation.mutate(survey.id)}>
                            <Send className="w-4 h-4 text-primary" />
                          </Button>
                        )}
                        {survey.status === 'published' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => pauseMutation.mutate({ id: survey.id, status: 'paused' })}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        {survey.status === 'draft' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(survey.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
