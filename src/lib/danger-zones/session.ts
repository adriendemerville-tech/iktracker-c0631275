import { loadDangerZones } from "./catalog.ts";
import { createDangerZoneDetector, type DangerZoneDetector } from "./detector.ts";
import { playZoneAlert } from "@/lib/sounds";
import type { DangerZoneBanner, DangerZoneEvent, DetectorPersist, ZoneSample } from "./types.ts";

const STORE_KEY = "ik-zone-pass";

function sessionStore(): Storage | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

function readStore(): DetectorPersist | null {
  try {
    const raw = sessionStore()?.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DetectorPersist;
    if (!parsed || !Array.isArray(parsed.zones)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStore(snapshot: DetectorPersist) {
  try {
    sessionStore()?.setItem(STORE_KEY, JSON.stringify(snapshot));
  } catch {
    // Persistence is a comfort against repeat sounds, not required to drive.
  }
}

function clearStore() {
  try {
    sessionStore()?.removeItem(STORE_KEY);
  } catch {
    // Ignore a locked private mode.
  }
}

export interface DangerZoneSession {
  arm: (waitMs?: number) => Promise<"ready" | "empty" | "pending">;
  observe: (sample: ZoneSample, enabled: boolean) => void;
  reset: () => void;
}

export function createDangerZoneSession(
  onBanner: (banner: DangerZoneBanner | null) => void,
  onUnavailable?: () => void,
): DangerZoneSession {
  let detector: DangerZoneDetector | null = null;
  let loading: Promise<"ready" | "empty"> | null = null;
  let banner: DangerZoneBanner | null = null;
  let leavingTimer: ReturnType<typeof setTimeout> | null = null;
  let warned = false;

  function notifyEmpty() {
    if (warned) return;
    warned = true;
    onUnavailable?.();
  }

  function emit(next: DangerZoneBanner | null) {
    if (
      banner?.phase === next?.phase &&
      banner?.vma === next?.vma &&
      banner?.speeding === next?.speeding &&
      (banner != null) === (next != null)
    ) {
      return;
    }
    banner = next;
    onBanner(next);
  }

  function clearLeavingTimer() {
    if (leavingTimer != null) {
      clearTimeout(leavingTimer);
      leavingTimer = null;
    }
  }

  async function load(): Promise<"ready" | "empty"> {
    if (detector) return "ready";
    if (!loading) {
      loading = loadDangerZones()
        .then((zones) => {
          if (zones.length === 0) {
            loading = null;
            return "empty";
          }
          detector = createDangerZoneDetector(zones);
          detector.hydrate(readStore(), Date.now());
          return "ready";
        })
        .catch(() => {
          loading = null;
          return "empty";
        });
    }
    return loading;
  }

  async function arm(waitMs = 2500): Promise<"ready" | "empty" | "pending"> {
    const pending = load();
    const status = await Promise.race([
      pending,
      new Promise<"pending">((resolve) => setTimeout(() => resolve("pending"), waitMs)),
    ]);
    if (status === "empty") notifyEmpty();
    if (status === "pending") {
      void pending.then((result) => {
        if (result === "empty") notifyEmpty();
      });
    }
    return status;
  }

  function observe(sample: ZoneSample, enabled: boolean) {
    if (!enabled || !detector) {
      if (!enabled && banner) {
        clearLeavingTimer();
        emit(null);
      }
      return;
    }

    const result = detector.update(sample);
    writeStore(detector.serialize(sample.timestamp));

    const audible = typeof document === "undefined" || document.visibilityState === "visible";
    if (audible) {
      for (const event of result.events) {
        playZoneAlert(event.type === "enter" ? "enter" : "exit");
      }
    }

    if (result.active) {
      clearLeavingTimer();
      emit({
        phase: "inside",
        vma: result.active.vma,
        speeding: result.active.speeding,
      });
      return;
    }

    let exit: DangerZoneEvent | undefined;
    for (const event of result.events) {
      if (event.type === "exit") exit = event;
    }
    if (exit) {
      emit({ phase: "leaving", vma: exit.vma, speeding: false });
      clearLeavingTimer();
      leavingTimer = setTimeout(() => emit(null), 2500);
      return;
    }

    if (banner?.phase === "inside") {
      clearLeavingTimer();
      emit(null);
    }
  }

  function reset() {
    clearLeavingTimer();
    detector?.reset();
    clearStore();
    emit(null);
  }

  return { arm, observe, reset };
}
