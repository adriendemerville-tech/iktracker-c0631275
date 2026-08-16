import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart3, Star, ChevronDown, ChevronUp, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { ContentBlock, SurveyVariant } from "./survey-types";

export interface ResponseRow {
  id: string;
  user_id: string;
  variant_id: string | null;
  responses: Record<string, unknown>;
  completed: boolean;
  created_at: string;
  user_email?: string | null;
}

export function SurveyResponsesPanel({ surveyId }: { surveyId: string }) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const { data: variants = [] } = useQuery({
    queryKey: ["survey-responses-variants", surveyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("survey_variants")
        .select("id, name, content_blocks")
        .eq("survey_id", surveyId);
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string; content_blocks: unknown }>;
    },
  });

  const { data: responses = [], isLoading } = useQuery({
    queryKey: ["survey-responses", surveyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("survey_responses")
        .select("id, user_id, variant_id, responses, completed, created_at")
        .eq("survey_id", surveyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ResponseRow[];
    },
  });

  const variantMap = new Map(variants.map((v) => [v.id, v]));

  const getQuestionLabel = (variantId: string | null, blockId: string): string => {
    if (!variantId) return blockId;
    const variant = variantMap.get(variantId);
    if (!variant) return blockId;
    const blocks = (variant.content_blocks as ContentBlock[]) || [];
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return blockId;
    const q =
      (block.config?.question as string) ||
      (block.config?.prompt as string) ||
      (block.config?.message as string);
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
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : responses.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-2">Aucune réponse pour le moment.</p>
      ) : (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-1.5">
            {responses.map((row) => {
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
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {variant.name}
                        </Badge>
                      )}
                      {row.completed ? (
                        <Badge variant="default" className="text-[10px] shrink-0">
                          Complété
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          Partiel
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(row.created_at), "dd MMM HH:mm", { locale: fr })}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
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
                              {answer === null || answer === undefined || answer === "" ? (
                                <em>(vide)</em>
                              ) : typeof answer === "object" ? (
                                JSON.stringify(answer)
                              ) : (
                                String(answer)
                              )}
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

export interface AggregatedBlock {
  variantId: string;
  variantName: string;
  blockId: string;
  type: ContentBlock["type"];
  question: string;
  // poll
  optionCounts?: Record<string, number>;
  // rating
  ratingValues?: number[];
  // text
  textAnswers?: string[];
  totalAnswered: number;
}

export function SurveyAggregatedStats({
  responses,
  variants,
}: {
  responses: ResponseRow[];
  variants: Array<{ id: string; name: string; content_blocks: unknown }>;
}) {
  const aggregates: AggregatedBlock[] = [];

  for (const variant of variants) {
    const blocks = (variant.content_blocks as ContentBlock[]) || [];
    const variantResponses = responses.filter((r) => r.variant_id === variant.id);
    if (variantResponses.length === 0) continue;

    for (const block of blocks) {
      if (block.type === "screenshot" || block.type === "share" || block.type === "info") continue;

      const question =
        (block.config?.question as string) || (block.config?.prompt as string) || block.id;

      const agg: AggregatedBlock = {
        variantId: variant.id,
        variantName: variant.name,
        blockId: block.id,
        type: block.type,
        question,
        totalAnswered: 0,
      };

      if (block.type === "poll") {
        agg.optionCounts = {};
        const options = (block.config?.options as string[]) || [];
        options.forEach((o) => {
          agg.optionCounts![o] = 0;
        });
        agg.optionCounts["(Autre / libre)"] = 0;
      } else if (block.type === "rating") {
        agg.ratingValues = [];
      } else {
        agg.textAnswers = [];
      }

      for (const r of variantResponses) {
        const raw = r.responses?.[block.id];
        if (raw === null || raw === undefined || raw === "") continue;
        agg.totalAnswered++;

        if (block.type === "poll" && agg.optionCounts) {
          const str = String(raw);
          if (str.startsWith("Autre:") || str.startsWith("__free_") || str === "__other__") {
            agg.optionCounts["(Autre / libre)"]++;
          } else if (agg.optionCounts[str] !== undefined) {
            agg.optionCounts[str]++;
          } else {
            // fallback: option label embedded "Label: free text"
            const label = str.split(":")[0].trim();
            if (agg.optionCounts[label] !== undefined) {
              agg.optionCounts[label]++;
            } else {
              agg.optionCounts["(Autre / libre)"]++;
            }
          }
        } else if (block.type === "rating" && agg.ratingValues) {
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
        {aggregates.map((agg) => (
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

            {agg.type === "poll" && agg.optionCounts && (
              <div className="space-y-1.5">
                {Object.entries(agg.optionCounts)
                  .filter(([, c]) => c > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([opt, count]) => {
                    const pct =
                      agg.totalAnswered > 0 ? Math.round((count / agg.totalAnswered) * 100) : 0;
                    return (
                      <div key={opt} className="space-y-0.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-foreground truncate pr-2">{opt}</span>
                          <span className="text-muted-foreground tabular-nums shrink-0">
                            {count} · {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {agg.type === "rating" && agg.ratingValues && agg.ratingValues.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                  <span className="font-semibold text-foreground tabular-nums">
                    {(
                      agg.ratingValues.reduce((s, v) => s + v, 0) / agg.ratingValues.length
                    ).toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">
                    / 5 · {agg.ratingValues.length} notes
                  </span>
                </div>
                <div className="space-y-0.5">
                  {[5, 4, 3, 2, 1].map((n) => {
                    const count = agg.ratingValues!.filter((v) => v === n).length;
                    const pct =
                      agg.ratingValues!.length > 0
                        ? Math.round((count / agg.ratingValues!.length) * 100)
                        : 0;
                    return (
                      <div key={n} className="flex items-center gap-2 text-[11px]">
                        <span className="w-3 text-muted-foreground">{n}</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-muted-foreground tabular-nums">
                          {count} · {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {agg.type === "text_question" && agg.textAnswers && (
              <p className="text-[11px] text-muted-foreground italic">
                {agg.totalAnswered} réponse{agg.totalAnswered > 1 ? "s" : ""} libre
                {agg.totalAnswered > 1 ? "s" : ""} — voir le détail ci-dessous.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
