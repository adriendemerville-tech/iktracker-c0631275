import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Read-only view on a backend job (`public.background_jobs`).
 *
 * The tab never orchestrates the work: it starts a job server-side, then polls
 * its row. Closing the tab, reloading or sleeping the device does not interrupt
 * anything — reopening simply re-attaches to the same job.
 */
export interface BackgroundJob {
  id: string;
  kind: string;
  status: "queued" | "running" | "succeeded" | "failed";
  phase: string | null;
  progress: number;
  processed: number;
  total: number | null;
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  finished_at: string | null;
}

const POLL_MS = 2500;
const COLUMNS =
  "id, kind, status, phase, progress, processed, total, result, error, created_at, finished_at";

export function useBackgroundJob(kind: string) {
  const [job, setJob] = useState<BackgroundJob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onDoneRef = useRef<((job: BackgroundJob) => void) | null>(null);
  const lastStatusRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fetchLatest = useCallback(async () => {
    const { data } = await supabase
      .from("background_jobs")
      .select(COLUMNS)
      .eq("kind", kind)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const next = (data as BackgroundJob | null) ?? null;
    setJob(next);

    if (next && (next.status === "succeeded" || next.status === "failed")) {
      stop();
      if (lastStatusRef.current !== next.status) {
        lastStatusRef.current = next.status;
        onDoneRef.current?.(next);
      }
    } else if (next) {
      lastStatusRef.current = next.status;
    }
    return next;
  }, [kind, stop]);

  const start = useCallback(
    (onDone?: (job: BackgroundJob) => void) => {
      onDoneRef.current = onDone ?? null;
      lastStatusRef.current = null;
      stop();
      void fetchLatest();
      timerRef.current = setInterval(() => void fetchLatest(), POLL_MS);
    },
    [fetchLatest, stop],
  );

  // Re-attach on mount: a job started before a reload is still running server-side.
  useEffect(() => {
    let cancelled = false;
    void fetchLatest().then((latest) => {
      if (cancelled) return;
      if (latest && (latest.status === "running" || latest.status === "queued")) {
        timerRef.current = setInterval(() => void fetchLatest(), POLL_MS);
      }
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, [fetchLatest, stop]);

  const isRunning = job?.status === "running" || job?.status === "queued";

  return { job, isRunning, start, refresh: fetchLatest };
}
