// Shared helper for fire-and-forget background writes in edge functions.
//
// High-volume telemetry (marketing analytics, access logs, usage metrics) must
// not block the HTTP response: the write is attached to the isolate lifecycle
// via EdgeRuntime.waitUntil and the response returns immediately. A lost write
// if the isolate dies is acceptable for metrics — never use this for
// correctness-critical writes (audit trails, quota enforcement reads).

// deno-lint-ignore no-explicit-any
type Work = () => Promise<any>;

export function defer(work: Work): void {
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } })
    .EdgeRuntime;
  const promise = Promise.resolve()
    .then(work)
    .catch((e) => console.error("[defer] background write failed:", e));
  if (runtime?.waitUntil) runtime.waitUntil(promise);
}
