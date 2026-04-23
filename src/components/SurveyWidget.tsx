import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Star, Send, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PERSONA_OPTIONS, type PersonaValue } from '@/components/PersonaPicker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ContentBlock {
  id: string;
  type: 'poll' | 'rating' | 'text_question' | 'screenshot' | 'share';
  config: Record<string, unknown>;
}

interface ActiveSurvey {
  id: string;
  title: string;
  variant_id: string;
  blocks: ContentBlock[];
}

/**
 * Check if a poll block's options match persona values,
 * meaning the survey is a "persona qualification" survey.
 */
function isPersonaPoll(block: ContentBlock): boolean {
  if (block.type !== 'poll') return false;
  const options = (block.config.options as string[]) || [];
  // Check if at least 3 options match persona labels
  const personaLabels: string[] = PERSONA_OPTIONS.map(p => p.label);
  const matches = options.filter(o => personaLabels.includes(o));
  return matches.length >= 3;
}

function getPersonaValueFromLabel(label: string): PersonaValue | null {
  const match = PERSONA_OPTIONS.find(p => p.label === label);
  return match ? match.value : null;
}

export function SurveyWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const [survey, setSurvey] = useState<ActiveSurvey | null>(null);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [dismissed, setDismissed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);

  // Fetch eligible survey
  useEffect(() => {
    if (!user || dismissed) return;

    const fetchSurvey = async () => {
      // Get user persona
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('persona')
        .eq('user_id', user.id)
        .maybeSingle();

      const userPersona = prefs?.persona || 'undefined';
      const currentPath = location.pathname;

      // Get published surveys
      const { data: surveys } = await supabase
        .from('surveys')
        .select('*')
        .eq('status', 'published')
        .not('published_at', 'is', null);

      if (!surveys?.length) return;

      // Filter by persona targeting and page
      const eligible = surveys.filter(s => {
        const targets = (s.target_personas as string[]) || [];
        const personaMatch = targets.length === 0 || targets.includes(userPersona);
        const pageMatch = currentPath.startsWith(s.target_page);
        return personaMatch && pageMatch;
      });

      if (!eligible.length) return;

      // Check impressions — skip surveys already completed or shown too many times
      for (const s of eligible) {
        const { count: impressionCount } = await supabase
          .from('survey_impressions')
          .select('*', { count: 'exact', head: true })
          .eq('survey_id', s.id)
          .eq('user_id', user.id);

        if ((impressionCount ?? 0) >= s.max_impressions_per_user) continue;

        // Check if already responded
        const { count: responseCount } = await supabase
          .from('survey_responses')
          .select('*', { count: 'exact', head: true })
          .eq('survey_id', s.id)
          .eq('user_id', user.id)
          .eq('completed', true);

        if ((responseCount ?? 0) > 0) continue;

        // Check delay between impressions
        const { data: lastImpression } = await supabase
          .from('survey_impressions')
          .select('created_at')
          .eq('survey_id', s.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastImpression) {
          const hoursSince = (Date.now() - new Date(lastImpression.created_at).getTime()) / (1000 * 60 * 60);
          if (hoursSince < s.delay_between_impressions_hours) continue;
        }

        // Get variant (pick one by weighted distribution)
        const { data: variants } = await supabase
          .from('survey_variants')
          .select('*')
          .eq('survey_id', s.id);

        if (!variants?.length) continue;

        // Simple weighted pick
        const totalPct = variants.reduce((sum, v) => sum + v.distribution_pct, 0);
        let rand = Math.random() * totalPct;
        let chosen = variants[0];
        for (const v of variants) {
          rand -= v.distribution_pct;
          if (rand <= 0) { chosen = v; break; }
        }

        const blocks = (chosen.content_blocks as unknown as ContentBlock[]) || [];
        if (!blocks.length) continue;

        // Record impression
        await supabase.from('survey_impressions').insert({
          survey_id: s.id,
          user_id: user.id,
          variant_id: chosen.id,
          action: 'shown',
        });

        setSurvey({
          id: s.id,
          title: s.title,
          variant_id: chosen.id,
          blocks,
        });
        return;
      }
    };

    // Delay to not block initial render
    const timer = setTimeout(fetchSurvey, 3000);
    return () => clearTimeout(timer);
  }, [user, location.pathname, dismissed]);

  const handleDismiss = useCallback(async () => {
    if (survey && user) {
      await supabase.from('survey_impressions').insert({
        survey_id: survey.id,
        user_id: user.id,
        variant_id: survey.variant_id,
        action: 'dismissed',
      });
    }
    setDismissed(true);
  }, [survey, user]);

  const syncPersonaIfNeeded = useCallback(async (block: ContentBlock, answer: unknown) => {
    if (!user || !isPersonaPoll(block)) return;
    const label = answer as string;
    const personaValue = getPersonaValueFromLabel(label);
    if (!personaValue) return;

    // Update user_preferences.persona
    await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        persona: personaValue,
      }, { onConflict: 'user_id' });
  }, [user]);

  const handleSubmit = useCallback(async () => {
    if (!survey || !user) return;

    // Resolve "other" values
    const resolvedResponses: Record<string, unknown> = {};
    for (const block of survey.blocks) {
      const answer = responses[block.id];
      if (answer === '__other__') {
        resolvedResponses[block.id] = `Autre: ${otherTexts[block.id] || ''}`.trim();
      } else {
        resolvedResponses[block.id] = answer;
        if (answer) await syncPersonaIfNeeded(block, answer);
      }
    }

    // Save response
    await supabase.from('survey_responses').insert([{
      survey_id: survey.id,
      user_id: user.id,
      variant_id: survey.variant_id,
      responses: JSON.parse(JSON.stringify(resolvedResponses)),
      completed: true,
    }]);

    setSubmitted(true);
    setTimeout(() => setDismissed(true), 2000);
  }, [survey, user, responses, otherTexts, syncPersonaIfNeeded]);

  const handleNext = () => {
    if (!survey) return;
    if (currentBlockIndex < survey.blocks.length - 1) {
      setCurrentBlockIndex(i => i + 1);
    } else {
      handleSubmit();
    }
  };

  if (!survey || dismissed) return null;

  if (submitted) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl p-5 animate-fade-in">
        <p className="text-center text-sm text-muted-foreground">Merci pour votre retour ! 🙏</p>
      </div>
    );
  }

  const block = survey.blocks[currentBlockIndex];
  const isLast = currentBlockIndex === survey.blocks.length - 1;
  const rawAnswer = responses[block.id];
  const hasAnswer = rawAnswer !== undefined && rawAnswer !== '' && (rawAnswer !== '__other__' || (otherTexts[block.id] || '').trim().length > 0);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <span className="text-xs font-semibold text-foreground truncate">{survey.title}</span>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {block.type === 'poll' && (
          <PollBlock
            block={block}
            value={responses[block.id] as string}
            onChange={val => setResponses(r => ({ ...r, [block.id]: val }))}
            otherText={otherTexts[block.id] || ''}
            onOtherTextChange={val => setOtherTexts(t => ({ ...t, [block.id]: val }))}
          />
        )}
        {block.type === 'rating' && (
          <RatingBlock
            block={block}
            value={responses[block.id] as number}
            hovered={hoveredRating}
            onHover={setHoveredRating}
            onChange={val => setResponses(r => ({ ...r, [block.id]: val }))}
          />
        )}
        {block.type === 'text_question' && (
          <TextBlock
            block={block}
            value={(responses[block.id] as string) || ''}
            onChange={val => setResponses(r => ({ ...r, [block.id]: val }))}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 flex items-center justify-between">
        {survey.blocks.length > 1 && (
          <span className="text-[10px] text-muted-foreground">
            {currentBlockIndex + 1}/{survey.blocks.length}
          </span>
        )}
        <Button
          size="sm"
          disabled={!hasAnswer}
          onClick={handleNext}
          className="ml-auto text-xs gap-1"
        >
          {isLast ? 'Envoyer' : 'Suivant'}
          {isLast ? <Send className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </Button>
      </div>
    </div>
  );
}

// ---- Sub-components ----

function PollBlock({ block, value, onChange, otherText, onOtherTextChange }: {
  block: ContentBlock; value?: string; onChange: (v: string) => void;
  otherText: string; onOtherTextChange: (v: string) => void;
}) {
  const question = (block.config.question as string) || '';
  const options = (block.config.options as string[]) || [];
  const allowOther = !!block.config.allowOther;
  const isOtherSelected = value === '__other__';

  return (
    <div className="space-y-2">
      {question && <p className="text-sm font-medium text-foreground">{question}</p>}
      <div className="space-y-1.5">
        {options.map((opt, i) => {
          const personaOption = PERSONA_OPTIONS.find(p => p.label === opt);
          const Icon = personaOption?.icon;
          return (
            <button
              key={i}
              onClick={() => onChange(opt)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left text-xs transition-all',
                value === opt
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
              <span>{opt}</span>
            </button>
          );
        })}
        {allowOther && (
          <>
            <button
              onClick={() => onChange('__other__')}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left text-xs transition-all',
                isOtherSelected
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              <span>Autre</span>
            </button>
            {isOtherSelected && (
              <Textarea
                value={otherText}
                onChange={e => onOtherTextChange(e.target.value.slice(0, 260))}
                placeholder="Précisez..."
                rows={2}
                maxLength={260}
                className="text-xs resize-none mt-1"
                autoFocus
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RatingBlock({ block, value, hovered, onHover, onChange }: {
  block: ContentBlock; value?: number; hovered: number;
  onHover: (v: number) => void; onChange: (v: number) => void;
}) {
  const question = (block.config.question as string) || '';
  return (
    <div className="space-y-2">
      {question && <p className="text-sm font-medium text-foreground">{question}</p>}
      <div className="flex gap-1 justify-center" onMouseLeave={() => onHover(0)}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onMouseEnter={() => onHover(n)}
            onClick={() => onChange(n)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                'w-7 h-7 transition-colors',
                (hovered || value || 0) >= n
                  ? 'text-primary fill-primary'
                  : 'text-muted-foreground/30'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function TextBlock({ block, value, onChange }: { block: ContentBlock; value: string; onChange: (v: string) => void }) {
  const question = (block.config.question as string) || '';
  const placeholder = (block.config.placeholder as string) || 'Votre réponse...';
  return (
    <div className="space-y-2">
      {question && <p className="text-sm font-medium text-foreground">{question}</p>}
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="text-xs resize-none"
      />
    </div>
  );
}
