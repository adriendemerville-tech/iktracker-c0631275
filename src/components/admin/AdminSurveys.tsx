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
  ChevronDown, ChevronUp, Loader2, ArrowLeft,
  Pause, Play, User as UserIcon, Info
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

// ---- Types ----

interface ContentBlock {
  id: string;
  type: 'poll' | 'rating' | 'text_question' | 'screenshot' | 'share' | 'info';
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
  { value: 'info', label: 'Texte / info', icon: Info },
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
  '/app', '/app/mestrajets', '/app/profile', '/calendrier', '/mode-tournee',
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
    case 'info':
      return { ...base, config: { title: '', text: '', buttonLabel: '', buttonUrl: '' } };
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
              {((block.config.options as string[]) || []).map((opt, i) => {
                const freeOptions = (block.config.freeOptions as number[]) || [];
                const isFree = freeOptions.includes(i);
                return (
                  <div key={i} className="group flex items-center gap-2 mt-1">
                    <Input
                      value={opt}
                      onChange={e => {
                        const opts = [...(block.config.options as string[])];
                        opts[i] = e.target.value;
                        onChange({ ...block, config: { ...block.config, options: opts } });
                      }}
                      placeholder={`Option ${i + 1}`}
                      className={isFree ? 'border-primary/50' : ''}
                    />
                    <div className={`flex items-center gap-1 shrink-0 transition-opacity ${isFree ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <label
                        className="flex items-center gap-1 cursor-pointer text-[10px] text-muted-foreground whitespace-nowrap select-none"
                        title="Champ libre : l'utilisateur peut saisir sa propre réponse"
                      >
                        <input
                          type="checkbox"
                          checked={isFree}
                          onChange={e => {
                            const prev = (block.config.freeOptions as number[]) || [];
                            const next = e.target.checked
                              ? [...prev, i]
                              : prev.filter(idx => idx !== i);
                            onChange({ ...block, config: { ...block.config, freeOptions: next } });
                          }}
                          className="rounded w-3 h-3"
                        />
                        Libre
                      </label>
                    </div>
                    {((block.config.options as string[]).length > 2) && (
                      <Button variant="ghost" size="icon" className="h-10 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                        const opts = (block.config.options as string[]).filter((_, j) => j !== i);
                        // Adjust freeOptions indices after removal
                        const prevFree = (block.config.freeOptions as number[]) || [];
                        const nextFree = prevFree
                          .filter(idx => idx !== i)
                          .map(idx => idx > i ? idx - 1 : idx);
                        onChange({ ...block, config: { ...block.config, options: opts, freeOptions: nextFree } });
                      }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
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
        {block.type === 'info' && (
          <>
            <div>
              <Label className="text-xs">Titre (optionnel)</Label>
              <Input
                value={(block.config.title as string) || ''}
                onChange={e => onChange({ ...block, config: { ...block.config, title: e.target.value } })}
                placeholder="Titre..."
              />
            </div>
            <div>
              <Label className="text-xs">Texte</Label>
              <Textarea
                value={(block.config.text as string) || ''}
                onChange={e => onChange({ ...block, config: { ...block.config, text: e.target.value } })}
                placeholder="Votre message..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Libellé bouton (optionnel)</Label>
                <Input
                  value={(block.config.buttonLabel as string) || ''}
                  onChange={e => onChange({ ...block, config: { ...block.config, buttonLabel: e.target.value } })}
                  placeholder="En savoir plus"
                />
              </div>
              <div>
                <Label className="text-xs">Lien (URL ou tab=NOM)</Label>
                <Input
                  value={(block.config.buttonUrl as string) || ''}
                  onChange={e => onChange({ ...block, config: { ...block.config, buttonUrl: e.target.value } })}
                  placeholder="/app/mestrajets ou tab=stats"
                />
              </div>
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

// ---- Survey responses panel ----

interface ResponseRow {
  id: string;
  user_id: string;
  variant_id: string | null;
  responses: Record<string, unknown>;
  completed: boolean;
  created_at: string;
  user_email?: string | null;
}

function SurveyResponsesPanel({ surveyId }: { surveyId: string }) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const { data: variants = [] } = useQuery({
    queryKey: ['survey-responses-variants', surveyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('survey_variants')
        .select('id, name, content_blocks')
        .eq('survey_id', surveyId);
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string; content_blocks: unknown }>;
    },
  });

  const { data: responses = [], isLoading } = useQuery({
    queryKey: ['survey-responses', surveyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('id, user_id, variant_id, responses, completed, created_at')
        .eq('survey_id', surveyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ResponseRow[];
    },
  });

  const variantMap = new Map(variants.map(v => [v.id, v]));

  const getQuestionLabel = (variantId: string | null, blockId: string): string => {
    if (!variantId) return blockId;
    const variant = variantMap.get(variantId);
    if (!variant) return blockId;
    const blocks = (variant.content_blocks as ContentBlock[]) || [];
    const block = blocks.find(b => b.id === blockId);
    if (!block) return blockId;
    const q = (block.config?.question as string) || (block.config?.prompt as string) || (block.config?.message as string);
    return q || block.type;
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-4">
      {!isLoading && responses.length > 0 && (
        <SurveyAggregatedStats responses={responses} variants={variants} />
      )}

      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Réponses détaillées ({responses.length})
        </h4>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : responses.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-2">Aucune réponse pour le moment.</p>
      ) : (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-1.5">
            {responses.map(row => {
              const isOpen = expandedRowId === row.id;
              const variant = row.variant_id ? variantMap.get(row.variant_id) : null;
              const entries = Object.entries(row.responses || {});
              return (
                <div key={row.id} className="border border-border rounded-md bg-muted/30">
                  <button
                    type="button"
                    onClick={() => setExpandedRowId(isOpen ? null : row.id)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/60 transition-colors rounded-md"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <UserIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs font-mono truncate">{row.user_id.slice(0, 8)}…</span>
                      {variant && (
                        <Badge variant="outline" className="text-[10px] shrink-0">{variant.name}</Badge>
                      )}
                      {row.completed ? (
                        <Badge variant="default" className="text-[10px] shrink-0">Complété</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] shrink-0">Partiel</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(row.created_at), 'dd MMM HH:mm', { locale: fr })}
                      </span>
                      {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border bg-background">
                      {entries.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Aucun champ rempli.</p>
                      ) : (
                        entries.map(([blockId, answer]) => (
                          <div key={blockId} className="text-xs">
                            <p className="font-medium text-foreground">
                              {getQuestionLabel(row.variant_id, blockId)}
                            </p>
                            <p className="text-muted-foreground mt-0.5 break-words whitespace-pre-wrap">
                              {answer === null || answer === undefined || answer === ''
                                ? <em>(vide)</em>
                                : typeof answer === 'object'
                                  ? JSON.stringify(answer)
                                  : String(answer)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ---- Aggregated stats per question across all responses ----

interface AggregatedBlock {
  variantId: string;
  variantName: string;
  blockId: string;
  type: ContentBlock['type'];
  question: string;
  // poll
  optionCounts?: Record<string, number>;
  // rating
  ratingValues?: number[];
  // text
  textAnswers?: string[];
  totalAnswered: number;
}

function SurveyAggregatedStats({
  responses,
  variants,
}: {
  responses: ResponseRow[];
  variants: Array<{ id: string; name: string; content_blocks: unknown }>;
}) {
  const aggregates: AggregatedBlock[] = [];

  for (const variant of variants) {
    const blocks = (variant.content_blocks as ContentBlock[]) || [];
    const variantResponses = responses.filter(r => r.variant_id === variant.id);
    if (variantResponses.length === 0) continue;

    for (const block of blocks) {
      if (block.type === 'screenshot' || block.type === 'share' || block.type === 'info') continue;

      const question =
        (block.config?.question as string) ||
        (block.config?.prompt as string) ||
        block.id;

      const agg: AggregatedBlock = {
        variantId: variant.id,
        variantName: variant.name,
        blockId: block.id,
        type: block.type,
        question,
        totalAnswered: 0,
      };

      if (block.type === 'poll') {
        agg.optionCounts = {};
        const options = (block.config?.options as string[]) || [];
        options.forEach(o => { agg.optionCounts![o] = 0; });
        agg.optionCounts['(Autre / libre)'] = 0;
      } else if (block.type === 'rating') {
        agg.ratingValues = [];
      } else {
        agg.textAnswers = [];
      }

      for (const r of variantResponses) {
        const raw = r.responses?.[block.id];
        if (raw === null || raw === undefined || raw === '') continue;
        agg.totalAnswered++;

        if (block.type === 'poll' && agg.optionCounts) {
          const str = String(raw);
          if (str.startsWith('Autre:') || str.startsWith('__free_') || str === '__other__') {
            agg.optionCounts['(Autre / libre)']++;
          } else if (agg.optionCounts[str] !== undefined) {
            agg.optionCounts[str]++;
          } else {
            // fallback: option label embedded "Label: free text"
            const label = str.split(':')[0].trim();
            if (agg.optionCounts[label] !== undefined) {
              agg.optionCounts[label]++;
            } else {
              agg.optionCounts['(Autre / libre)']++;
            }
          }
        } else if (block.type === 'rating' && agg.ratingValues) {
          const n = Number(raw);
          if (!isNaN(n)) agg.ratingValues.push(n);
        } else if (agg.textAnswers) {
          agg.textAnswers.push(String(raw));
        }
      }

      aggregates.push(agg);
    }
  }

  if (aggregates.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-3.5 h-3.5 text-primary" />
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Statistiques consolidées
        </h4>
      </div>

      <div className="space-y-3">
        {aggregates.map(agg => (
          <div
            key={`${agg.variantId}-${agg.blockId}`}
            className="border border-border rounded-md bg-muted/20 p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-foreground">{agg.question}</p>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {agg.variantName} · {agg.totalAnswered} rép.
              </Badge>
            </div>

            {agg.type === 'poll' && agg.optionCounts && (
              <div className="space-y-1.5">
                {Object.entries(agg.optionCounts)
                  .filter(([, c]) => c > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([opt, count]) => {
                    const pct = agg.totalAnswered > 0 ? Math.round((count / agg.totalAnswered) * 100) : 0;
                    return (
                      <div key={opt} className="space-y-0.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-foreground truncate pr-2">{opt}</span>
                          <span className="text-muted-foreground tabular-nums shrink-0">
                            {count} · {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {agg.type === 'rating' && agg.ratingValues && agg.ratingValues.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                  <span className="font-semibold text-foreground tabular-nums">
                    {(agg.ratingValues.reduce((s, v) => s + v, 0) / agg.ratingValues.length).toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">/ 5 · {agg.ratingValues.length} notes</span>
                </div>
                <div className="space-y-0.5">
                  {[5, 4, 3, 2, 1].map(n => {
                    const count = agg.ratingValues!.filter(v => v === n).length;
                    const pct = agg.ratingValues!.length > 0 ? Math.round((count / agg.ratingValues!.length) * 100) : 0;
                    return (
                      <div key={n} className="flex items-center gap-2 text-[11px]">
                        <span className="w-3 text-muted-foreground">{n}</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-12 text-right text-muted-foreground tabular-nums">{count} · {pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {agg.type === 'text_question' && agg.textAnswers && (
              <p className="text-[11px] text-muted-foreground italic">
                {agg.totalAnswered} réponse{agg.totalAnswered > 1 ? 's' : ''} libre{agg.totalAnswered > 1 ? 's' : ''} — voir le détail ci-dessous.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Main component ----

export function AdminSurveys() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [editingVariants, setEditingVariants] = useState<SurveyVariant[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedSurveyId, setExpandedSurveyId] = useState<string | null>(null);

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
                  <label className="flex items-center gap-1.5 text-xs">
                    <Checkbox
                      checked={form.target_personas.includes('undefined')}
                      onCheckedChange={checked => {
                        setForm(f => ({
                          ...f,
                          target_personas: checked
                            ? [...f.target_personas, 'undefined']
                            : f.target_personas.filter(v => v !== 'undefined'),
                        }));
                      }}
                    />
                    Non défini
                  </label>
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
                            Publié le {format(new Date(survey.published_at), 'dd MMM yyyy HH:mm', { locale: fr })} · en ligne depuis {differenceInDays(new Date(), new Date(survey.published_at))} jours
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={expandedSurveyId === survey.id ? 'Masquer les réponses' : 'Voir les réponses'}
                          onClick={() => setExpandedSurveyId(expandedSurveyId === survey.id ? null : survey.id)}
                        >
                          <Eye className={`w-4 h-4 ${expandedSurveyId === survey.id ? 'text-primary' : ''}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Modifier" onClick={() => startEditing(survey)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        {survey.status === 'draft' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Publier" onClick={() => publishMutation.mutate(survey.id)}>
                            <Send className="w-4 h-4 text-primary" />
                          </Button>
                        )}
                        {survey.status === 'published' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Mettre en pause" onClick={() => pauseMutation.mutate({ id: survey.id, status: 'paused' })}>
                            <Pause className="w-4 h-4" />
                          </Button>
                        )}
                        {survey.status === 'paused' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Reprendre" onClick={() => pauseMutation.mutate({ id: survey.id, status: 'published' })}>
                            <Play className="w-4 h-4 text-primary" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Supprimer" onClick={() => {
                          if (window.confirm(`Supprimer définitivement "${survey.title}" ?`)) {
                            deleteMutation.mutate(survey.id);
                          }
                        }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {expandedSurveyId === survey.id && (
                      <SurveyResponsesPanel surveyId={survey.id} />
                    )}
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
