// Centralized cost control for paid third-party APIs (Wavespeed, Browserless,
// Google Distance Matrix, Lovable AI Gateway, OpenAI, Mistral…).
//
// Two responsibilities:
//  1. assertAIBudget() — hard monthly cap, read from site_config.api_budget
//     (admins can tune it, default 100 €/month). Throws BudgetExceededError
//     when the month's recorded spend reaches the cap. Fail-open on infra
//     errors (availability first), with an error_logs trace.
//  2. trackAICost() — uniform, non-blocking write to api_usage_logs so every
//     paid call leaves a cost trace. Deferred via EdgeRuntime.waitUntil.
//
// The monthly spend lookup is cached per isolate for 60 s and incremented
// optimistically by trackAICost, so the guard stays cheap under burst traffic.

import { defer } from "./deferred.ts";

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

const CACHE_TTL_MS = 60_000;
const DEFAULT_MONTHLY_CAP_EUR = 100;

export class BudgetExceededError extends Error {
  constructor(spent: number, cap: number) {
    super(`AI budget exceeded: ${spent.toFixed(2)}€ / ${cap}€ this month`);
    this.name = "BudgetExceededError";
  }
}

interface SpendCache {
  spent: number;
  cap: number;
  at: number;
}
let spendCache: SpendCache | null = null;

async function readMonthlySpend(supabase: SupabaseLike): Promise<SpendCache> {
  const now = Date.now();
  if (spendCache && now - spendCache.at < CACHE_TTL_MS) return spendCache;

  const { data: cfg } = await supabase
    .from("site_config")
    .select("config_value")
    .eq("config_key", "api_budget")
    .maybeSingle();
  const cap = Number((cfg?.config_value as { monthly_euros?: number } | null)?.monthly_euros) ||
    DEFAULT_MONTHLY_CAP_EUR;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("api_usage_logs")
    .select("cost_euros.sum()")
    .gte("created_at", monthStart.toISOString());
  if (error) throw new Error(`budget spend query failed: ${error.message}`);

  const spent = Number((data?.[0] as { sum?: number | string } | undefined)?.sum ?? 0) || 0;
  spendCache = { spent, cap, at: now };
  return spendCache;
}

/**
 * Throws BudgetExceededError when the monthly cap is reached.
 * Call once at the top of a handler, after caller auth, before any paid call.
 */
export async function assertAIBudget(supabase: SupabaseLike, functionName: string): Promise<void> {
  try {
    const { spent, cap } = await readMonthlySpend(supabase);
    if (cap > 0 && spent >= cap) {
      defer(() =>
        supabase.from("autopilot_events").insert({
          event_type: "ai_budget_exceeded",
          severity: "critical",
          message: `💸 Plafond API mensuel atteint (${spent.toFixed(2)}€ / ${cap}€) — ${functionName} bloquée`,
          details: { function_name: functionName, spent_euros: spent, cap_euros: cap },
        })
      );
      throw new BudgetExceededError(spent, cap);
    }
  } catch (e) {
    if (e instanceof BudgetExceededError) throw e;
    // Fail-open: a broken budget check must not take down user-facing features.
    console.error(`[cost-guard] budget check failed for ${functionName}:`, e);
    defer(() =>
      supabase.from("error_logs").insert({
        source: "Backend",
        error_type: "budget_check_failure",
        message: `Budget check failed for ${functionName}`,
        description: e instanceof Error ? e.message : String(e),
      })
    );
  }
}

export interface CostEntry {
  functionName: string;
  model?: string | null;
  tokensInput?: number | null;
  tokensOutput?: number | null;
  costEuros?: number | null;
  userId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Non-blocking insert into api_usage_logs + optimistic cache increment. */
export function trackAICost(supabase: SupabaseLike, entry: CostEntry): void {
  if (spendCache && entry.costEuros) spendCache.spent += entry.costEuros;
  defer(() =>
    supabase.from("api_usage_logs").insert({
      function_name: entry.functionName,
      model: entry.model ?? null,
      tokens_input: entry.tokensInput ?? null,
      tokens_output: entry.tokensOutput ?? null,
      cost_euros: entry.costEuros ?? null,
      user_id: entry.userId ?? null,
      metadata: entry.metadata ?? null,
    })
  );
}

/** Rough per-call cost estimates (EUR) — documented defaults, tune as pricing evolves. */
export const COST_ESTIMATES = {
  wavespeed_prediction: 0.2,
  wavespeed_llm_call: 0.002,
  browserless_pdf: 0.01,
  browserless_screencast: 0.05,
  distance_matrix_element: 0.005,
  whisper_minute: 0.006,
} as const;
