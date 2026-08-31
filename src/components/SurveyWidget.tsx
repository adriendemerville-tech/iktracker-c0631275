import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "@/lib/router-compat";
import { X, Star, Send, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PERSONA_OPTIONS, type PersonaValue } from "@/components/PersonaPicker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ContentBlock {
  id: string;
  type: "poll" | "rating" | "text_question" | "screenshot" | "share" | "info" | "cta";
  config: Record<string, unknown>;
}

interface ActiveSurvey {
  id: string;
  title: string;
  variant_id: string;
  blocks: ContentBlock[];
  font_size: "small" | "standard" | "large";
}

/**
 * Check if a poll block's options match persona values,
 * meaning the survey is a "persona qualification" survey.
 */
function isPersonaPoll(block: ContentBlock): boolean {
  if (block.type !== "poll") return false;
  const options = (block.config.options as string[]) || [];
  // Check if at least 3 options match persona labels
  const personaLabels: string[] = PERSONA_OPTIONS.map((p) => p.label);
  const matches = options.filter((o) => personaLabels.includes(o));
  return matches.length >= 3;
}

// Keyword-based fallback matching for tolerant persona detection
const PERSONA_KEYWORDS: Record<PersonaValue, string[]> = {
  sante_liberal: [
    "sante",
    "santé",
    "medical",
    "médical",
    "liberal",
    "libéral",
    "infirmier",
    "medecin",
    "médecin",
    "kine",
    "kiné",
  ],
  artisan_btp: [
    "artisan",
    "btp",
    "batiment",
    "bâtiment",
    "maitre",
    "maître",
    "oeuvre",
    "œuvre",
    "plombier",
    "electricien",
    "électricien",
    "macon",
    "maçon",
  ],
  consultant_freelance: [
    "consultant",
    "freelance",
    "independant",
    "indépendant",
    "avocat",
    "coach",
  ],
  commercial_immobilier: ["commercial", "immobilier", "agent", "vente", "vendeur", "vrp"],
  expert_comptable_tns: ["comptable", "expert", "tns", "dirigeant", "gerant", "gérant"],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getPersonaValueFromLabel(label: string): PersonaValue | null {
  if (!label) return null;
  // 1. Exact match
  const exact = PERSONA_OPTIONS.find((p) => p.label === label);
  if (exact) return exact.value;

  // 2. Strip "Autre:" / "Autre :" prefix
  const cleaned = label.replace(/^autre\s*:?\s*/i, "").trim();
  const norm = normalize(cleaned);
  if (!norm) return null;

  // 3. Case-insensitive label match (partial)
  const labelMatch = PERSONA_OPTIONS.find((p) => {
    const pn = normalize(p.label);
    return pn === norm || pn.includes(norm) || norm.includes(pn);
  });
  if (labelMatch) return labelMatch.value;

  // 4. Keyword match — score by number of keywords found
  let best: { value: PersonaValue; score: number } | null = null;
  for (const [value, keywords] of Object.entries(PERSONA_KEYWORDS) as [PersonaValue, string[]][]) {
    const score = keywords.filter((kw) => norm.includes(kw)).length;
    if (score > 0 && (!best || score > best.score)) {
      best = { value, score };
    }
  }
  return best ? best.value : null;
}

export function SurveyWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<ActiveSurvey | null>(null);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [dismissed, setDismissed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  // Fetch eligible survey
  useEffect(() => {
    if (!user || dismissed) return;

    const fetchSurvey = async () => {
      // Get user persona
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("persona")
        .eq("user_id", user.id)
        .maybeSingle();

      const userPersona = prefs?.persona || "undefined";
      const currentPath = location.pathname;

      // Get published surveys
      const { data: surveys } = await supabase
        .from("surveys")
        .select("*")
        .eq("status", "published")
        .not("published_at", "is", null);

      if (!surveys?.length) return;

      // Filter by persona targeting and page
      const eligible = surveys.filter((s) => {
        const targets = (s.target_personas as string[]) || [];
        const personaMatch = targets.length === 0 || targets.includes(userPersona);
        const pageMatch = currentPath.startsWith(s.target_page);
        return personaMatch && pageMatch;
      });

      if (!eligible.length) return;

      // Check impressions — skip surveys already completed, dismissed twice, or shown too many times
      for (const s of eligible) {
        const { count: impressionCount } = await supabase
          .from("survey_impressions")
          .select("*", { count: "exact", head: true })
          .eq("survey_id", s.id)
          .eq("user_id", user.id);

        if ((impressionCount ?? 0) >= s.max_impressions_per_user) continue;

        // Hard stop: never re-show after two dismissals
        const { count: dismissCount } = await supabase
          .from("survey_impressions")
          .select("*", { count: "exact", head: true })
          .eq("survey_id", s.id)
          .eq("user_id", user.id)
          .eq("action", "dismissed");

        if ((dismissCount ?? 0) >= 2) continue;

        // Check if already responded
        const { count: responseCount } = await supabase
          .from("survey_responses")
          .select("*", { count: "exact", head: true })
          .eq("survey_id", s.id)
          .eq("user_id", user.id)
          .eq("completed", true);

        if ((responseCount ?? 0) > 0) continue;

        // Check delay between impressions
        const { data: lastImpression } = await supabase
          .from("survey_impressions")
          .select("created_at")
          .eq("survey_id", s.id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastImpression) {
          const hoursSince =
            (Date.now() - new Date(lastImpression.created_at).getTime()) / (1000 * 60 * 60);
          if (hoursSince < s.delay_between_impressions_hours) continue;
        }

        // Get variant (pick one by weighted distribution)
        const { data: variants } = await supabase
          .from("survey_variants")
          .select("*")
          .eq("survey_id", s.id);

        if (!variants?.length) continue;

        // Simple weighted pick
        const totalPct = variants.reduce((sum, v) => sum + v.distribution_pct, 0);
        let rand = Math.random() * totalPct;
        let chosen = variants[0];
        for (const v of variants) {
          rand -= v.distribution_pct;
          if (rand <= 0) {
            chosen = v;
            break;
          }
        }

        const blocks = (chosen.content_blocks as unknown as ContentBlock[]) || [];
        if (!blocks.length) continue;

        // Record impression
        await supabase.from("survey_impressions").insert({
          survey_id: s.id,
          user_id: user.id,
          variant_id: chosen.id,
          action: "shown",
        });

        setSurvey({
          id: s.id,
          title: s.title,
          variant_id: chosen.id,
          blocks,
          font_size: ((s as any).font_size as ActiveSurvey["font_size"]) || "standard",
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
      await supabase.from("survey_impressions").insert({
        survey_id: survey.id,
        user_id: user.id,
        variant_id: survey.variant_id,
        action: "dismissed",
      });
    }
    setDismissed(true);
  }, [survey, user]);

  const syncPersonaIfNeeded = useCallback(
    async (block: ContentBlock, answer: unknown) => {
      if (!user || !isPersonaPoll(block)) return;
      const label = answer as string;
      const personaValue = getPersonaValueFromLabel(label);
      if (!personaValue) return;

      // Update user_preferences.persona
      await supabase.from("user_preferences").upsert(
        {
          user_id: user.id,
          persona: personaValue,
        },
        { onConflict: "user_id" },
      );
    },
    [user],
  );

  const handleSubmit = useCallback(async () => {
    if (!survey || !user) return;

    // Resolve free-text values
    const resolvedResponses: Record<string, unknown> = {};
    try {
      for (const block of survey.blocks) {
        const rawAnswer = responses[block.id];
        if (rawAnswer === undefined || rawAnswer === null || rawAnswer === "") {
          resolvedResponses[block.id] = rawAnswer ?? null;
          continue;
        }

        // Non-string answers (e.g. rating numbers) are stored as-is
        if (typeof rawAnswer !== "string") {
          resolvedResponses[block.id] = rawAnswer;
          continue;
        }

        const answer = rawAnswer;
        const freeMatch = answer.match(/^__free_(\d+)__$/);
        if (answer === "__other__") {
          resolvedResponses[block.id] = `Autre: ${otherTexts[block.id] || ""}`.trim();
        } else if (freeMatch) {
          const idx = parseInt(freeMatch[1]);
          const options = (block.config.options as string[]) || [];
          const label = options[idx] || "Autre";
          const freeKey = `${block.id}_${idx}`;
          resolvedResponses[block.id] = `${label}: ${otherTexts[freeKey] || ""}`.trim();
        } else {
          resolvedResponses[block.id] = answer;
        }
        await syncPersonaIfNeeded(block, resolvedResponses[block.id]);
      }

      // Save response
      const { error: insertError } = await supabase.from("survey_responses").insert([
        {
          survey_id: survey.id,
          user_id: user.id,
          variant_id: survey.variant_id,
          responses: JSON.parse(JSON.stringify(resolvedResponses)),
          completed: true,
        },
      ]);
      if (insertError) console.error("Survey insert failed:", insertError);
    } catch (err) {
      console.error("Survey submit error:", err);
    }

    setSubmitted(true);
    dismissTimerRef.current = setTimeout(() => setDismissed(true), 2000);
  }, [survey, user, responses, otherTexts, syncPersonaIfNeeded]);

  const handleNext = () => {
    if (!survey) return;
    if (currentBlockIndex < survey.blocks.length - 1) {
      setCurrentBlockIndex((i) => i + 1);
    } else {
      handleSubmit();
    }
  };

  if (!survey || dismissed) return null;

  if (submitted) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setDismissed(true)} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div className="w-80 bg-card border border-border rounded-xl shadow-2xl p-5 animate-fade-in pointer-events-auto">
            <p className="text-center text-base text-card-foreground">Merci pour votre retour ! 🙏</p>
          </div>
        </div>
      </>
    );
  }

  const block = survey.blocks[currentBlockIndex];
  const isLast = currentBlockIndex === survey.blocks.length - 1;
  const rawAnswer = responses[block.id] as string | undefined;
  const isFreeAnswer =
    typeof rawAnswer === "string" && (rawAnswer === "__other__" || rawAnswer.startsWith("__free_"));
  const freeKey =
    rawAnswer === "__other__"
      ? block.id
      : `${block.id}_${rawAnswer?.match(/__free_(\d+)__/)?.[1] ?? ""}`;
  const hasAnswer =
    block.type === "info" ||
    block.type === "cta" ||
    block.type === "screenshot" ||
    block.type === "share" ||
    (rawAnswer !== undefined &&
      rawAnswer !== "" &&
      (!isFreeAnswer || (otherTexts[freeKey] || "").trim().length > 0));

  const handleInfoButtonClick = (url: string) => {
    if (!url) return;
    if (url.startsWith("tab=")) {
      const params = new URLSearchParams(location.search);
      params.set("tab", url.slice(4));
      navigate(`${location.pathname}?${params.toString()}`);
      setDismissed(true);
      return;
    }
    if (/^https?:\/\//i.test(url)) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(url);
    setDismissed(true);
  };

  const hasActionButton =
    (block.type === "info" || block.type === "cta") &&
    !!(block.config.buttonLabel && block.config.buttonUrl);

  const longestText = Math.max(
    ...survey.blocks.map(
      (b) =>
        `${(b.config.text as string) || ""}${(b.config.title as string) || ""}${(b.config.question as string) || ""}`
          .length
    ),
    0
  );
  const sizeClass =
    longestText > 700
      ? "w-[min(94vw,40rem)] max-h-[min(85vh,34rem)]"
      : longestText > 350
        ? "w-[min(92vw,32rem)] max-h-[min(80vh,30rem)]"
        : "w-80 max-h-[420px]";

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={handleDismiss} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          data-survey-size={survey.font_size || "standard"}
          className={cn(
            sizeClass,
            "bg-card border border-border rounded-xl shadow-2xl animate-fade-in overflow-hidden pointer-events-auto flex flex-col"
          )}
        >

          {/* Header */}
          <div className="relative flex items-center justify-center px-4 py-3 border-b border-border bg-muted shrink-0">
            <span className="text-sm font-semibold text-foreground text-center truncate px-6">
              {survey.title}
            </span>
            <button
              onClick={handleDismiss}
              className="absolute right-4 text-muted-foreground hover:text-foreground transition-colors outline-none focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
            {block.type === "poll" && (
              <PollBlock
                block={block}
                value={responses[block.id] as string}
                onChange={(val) => setResponses((r) => ({ ...r, [block.id]: val }))}
                otherTexts={otherTexts}
                onOtherTextChange={(key, val) => setOtherTexts((t) => ({ ...t, [key]: val }))}
              />
            )}
            {block.type === "rating" && (
              <RatingBlock
                block={block}
                value={responses[block.id] as number}
                hovered={hoveredRating}
                onHover={setHoveredRating}
                onChange={(val) => setResponses((r) => ({ ...r, [block.id]: val }))}
              />
            )}
            {block.type === "text_question" && (
              <TextBlock
                block={block}
                value={(responses[block.id] as string) || ""}
                onChange={(val) => setResponses((r) => ({ ...r, [block.id]: val }))}
              />
            )}
            {block.type === "info" && (
              <InfoBlock
                block={block}
                onButtonClick={handleInfoButtonClick}
                pushButtonToBottom={hasActionButton}
                showButton={!hasActionButton}
              />
            )}
            {block.type === "cta" && (
              <InfoBlock
                block={block}
                onButtonClick={handleInfoButtonClick}
                pushButtonToBottom={hasActionButton}
                showButton={!hasActionButton}
              />
            )}
          </div>

          {/* Footer */}
          {!hasActionButton && (
            <div className="px-4 pb-3 shrink-0 flex items-center justify-between">
              {survey.blocks.length > 1 && (
                <span className="text-xs text-muted-foreground">
                  {currentBlockIndex + 1}/{survey.blocks.length}
                </span>
              )}
              <Button
                size="sm"
                disabled={!hasAnswer}
                onClick={handleNext}
                className="ml-auto text-sm gap-1"
              >
                {isLast ? "Envoyer" : "Suivant"}
                {isLast ? <Send className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ---- Sub-components ----

export function PollBlock({
  block,
  value,
  onChange,
  otherTexts,
  onOtherTextChange,
}: {
  block: ContentBlock;
  value?: string;
  onChange: (v: string) => void;
  otherTexts: Record<string, string>;
  onOtherTextChange: (key: string, v: string) => void;
}) {
  const question = (block.config.question as string) || "";
  const options = (block.config.options as string[]) || [];
  const freeOptions = (block.config.freeOptions as number[]) || [];
  // Legacy support: allowOther adds a standalone "Autre" option
  const legacyAllowOther = !!block.config.allowOther && freeOptions.length === 0;

  return (
    <div className="space-y-2">
      {question && <p className="text-base font-medium text-foreground">{question}</p>}
      <div className="space-y-2">
        {options.map((opt, i) => {
          const personaOption = PERSONA_OPTIONS.find((p) => p.label === opt);
          const Icon = personaOption?.icon;
          const isFree = freeOptions.includes(i);
          const isSelected = value === opt || (isFree && value === `__free_${i}__`);
          const freeKey = `${block.id}_${i}`;
          return (
            <div key={i}>
              <button
                onClick={() => onChange(isFree ? `__free_${i}__` : opt)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left text-sm transition-all",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/50",
                )}
              >
                {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
                <span>{opt}</span>
              </button>
              {isFree && isSelected && (
                <Textarea
                  value={otherTexts[freeKey] || ""}
                  onChange={(e) => onOtherTextChange(freeKey, e.target.value.slice(0, 260))}
                  placeholder="Précisez..."
                  rows={2}
                  maxLength={260}
                  className="text-sm resize-none mt-1"
                  autoFocus
                />
              )}
            </div>
          );
        })}
        {legacyAllowOther && (
          <>
            <button
              onClick={() => onChange("__other__")}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left text-sm transition-all",
                value === "__other__"
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/50",
              )}
            >
              <span>Autre</span>
            </button>
            {value === "__other__" && (
              <Textarea
                value={otherTexts[block.id] || ""}
                onChange={(e) => onOtherTextChange(block.id, e.target.value.slice(0, 260))}
                placeholder="Précisez..."
                rows={2}
                maxLength={260}
                className="text-sm resize-none mt-1"
                autoFocus
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function RatingBlock({
  block,
  value,
  hovered,
  onHover,
  onChange,
}: {
  block: ContentBlock;
  value?: number;
  hovered: number;
  onHover: (v: number) => void;
  onChange: (v: number) => void;
}) {
  const question = (block.config.question as string) || "";
  return (
    <div className="space-y-3">
      {question && <p className="text-base font-medium text-foreground">{question}</p>}
      <div className="flex gap-1.5 justify-center" onMouseLeave={() => onHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onMouseEnter={() => onHover(n)}
            onClick={() => onChange(n)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                "w-8 h-8 transition-colors",
                (hovered || value || 0) >= n
                  ? "text-primary fill-primary"
                  : "text-muted-foreground/30",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function TextBlock({
  block,
  value,
  onChange,
}: {
  block: ContentBlock;
  value: string;
  onChange: (v: string) => void;
}) {
  const question = (block.config.question as string) || "";
  const placeholder = (block.config.placeholder as string) || "Votre réponse...";
  return (
    <div className="space-y-3">
      {question && <p className="text-base font-medium text-foreground">{question}</p>}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="text-sm resize-none"
      />
    </div>
  );
}

export function InfoBlock({
  block,
  onButtonClick,
  pushButtonToBottom = false,
  showButton = true,
}: {
  block: ContentBlock;
  onButtonClick: (url: string) => void;
  pushButtonToBottom?: boolean;
  showButton?: boolean;
}) {
  const title = (block.config.title as string) || "";
  const text = (block.config.text as string) || "";
  const buttonLabel = (block.config.buttonLabel as string) || "";
  const buttonUrl = (block.config.buttonUrl as string) || "";
  return (
    <div className={cn("space-y-3", pushButtonToBottom && "flex flex-col flex-1 min-h-0")}>
      {title && <p className="text-base font-semibold text-foreground">{title}</p>}
      {text && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{text}</p>}
      {showButton && buttonLabel && buttonUrl && (
        <div className={cn("flex justify-center", pushButtonToBottom && "mt-auto")}>
          <Button
            size="sm"
            variant={block.type === "cta" ? "default" : "outline"}
            className="w-auto text-sm px-6"
            onClick={() => onButtonClick(buttonUrl)}
          >
            {buttonLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
