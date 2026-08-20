// Shared helpers for backend-authoritative long-running jobs.
//
// Rule: anything long, costly or asynchronous belongs to the backend. The tab is
// only a viewer. Each job gets a row in `public.background_jobs` that the client
// polls through RLS (own rows only); the work itself keeps running via
// `EdgeRuntime.waitUntil` even if the tab is closed or the device sleeps.

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

export interface JobHandle {
  id: string;
  setPhase(phase: string, progress?: number): Promise<void>;
  setProgress(processed: number, total?: number | null): Promise<void>;
  succeed(result: unknown): Promise<void>;
  fail(error: unknown): Promise<void>;
}

export async function createJob(
  supabase: SupabaseLike,
  kind: string,
  userId: string | null,
  params: Record<string, unknown> = {},
): Promise<JobHandle | null> {
  const { data, error } = await supabase
    .from("background_jobs")
    .insert({
      kind,
      user_id: userId,
      status: "running",
      phase: "Démarrage",
      params,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error(`[jobs] failed to create job ${kind}:`, error?.message);
    return null;
  }

  const id = data.id as string;
  // deno-lint-ignore no-explicit-any
  const patch = async (fields: Record<string, any>) => {
    const { error: upErr } = await supabase.from("background_jobs").update(fields).eq("id", id);
    if (upErr) console.warn(`[jobs] update ${id} failed:`, upErr.message);
  };

  return {
    id,
    setPhase: (phase, progress) => patch(progress === undefined ? { phase } : { phase, progress }),
    setProgress: (processed, total) =>
      patch({
        processed,
        ...(total === undefined ? {} : { total }),
        progress: total && total > 0 ? Math.min(99, Math.round((processed / total) * 100)) : 0,
      }),
    succeed: (result) =>
      patch({
        status: "succeeded",
        progress: 100,
        phase: "Terminé",
        result: result ?? {},
        finished_at: new Date().toISOString(),
      }),
    fail: (err) =>
      patch({
        status: "failed",
        phase: "Échec",
        error: err instanceof Error ? err.message : String(err),
        finished_at: new Date().toISOString(),
      }),
  };
}

/**
 * Run `work` detached from the HTTP response so the job survives the client
 * closing the tab. Falls back to a plain floating promise when the runtime does
 * not expose `waitUntil`.
 */
export function runDetached(work: () => Promise<void>): void {
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } })
    .EdgeRuntime;
  const promise = work().catch((e) => console.error("[jobs] detached work crashed:", e));
  if (runtime?.waitUntil) runtime.waitUntil(promise);
}

export function jobAcceptedResponse(job: JobHandle | null, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ success: true, job_id: job?.id ?? null, status: "running" }), {
    status: 202,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
