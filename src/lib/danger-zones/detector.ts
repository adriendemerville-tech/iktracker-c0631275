import {
  CONFIRM_POINTS,
  COOLDOWN_MS,
  ENTER_SPEED_KMH,
  EXIT_MARGIN_M,
  GPS_LOSS_MS,
  JUMP_DISTANCE_M,
  JUMP_HEADING_DEG,
  JUMP_SPEED_KMH,
} from "./constants.ts";
import { bearingDegrees, distanceMeters, headingDeltaDegrees } from "./geometry.ts";
import type {
  ActiveDangerZone,
  DangerCircle,
  DangerZone,
  DangerZoneEvent,
  DetectorPersist,
  ZoneSample,
} from "./types.ts";

interface ZoneRuntime {
  phase: "in" | "out";
  insideStreak: number;
  outsideStreak: number;
  cooldownUntil: number;
  alerted: boolean;
  vma: number | null;
  speeding: boolean;
}

export interface DetectorUpdate {
  events: DangerZoneEvent[];
  active: ActiveDangerZone | null;
}

const CELL = 0.1;

function cellKey(lat: number, lng: number): string {
  return `${Math.floor(lat / CELL)}:${Math.floor(lng / CELL)}`;
}

function blankState(): ZoneRuntime {
  return {
    phase: "out",
    insideStreak: 0,
    outsideStreak: 0,
    cooldownUntil: 0,
    alerted: false,
    vma: null,
    speeding: false,
  };
}

function vmaOf(circles: DangerCircle[]): number | null {
  let best: number | null = null;
  for (const circle of circles) {
    if (circle.vma == null) continue;
    best = best == null ? circle.vma : Math.min(best, circle.vma);
  }
  return best;
}

function speedKmhOf(sample: ZoneSample, previous: ZoneSample | null): number | null {
  if (
    typeof sample.speedMps === "number" &&
    Number.isFinite(sample.speedMps) &&
    sample.speedMps >= 0
  ) {
    return sample.speedMps * 3.6;
  }
  if (!previous) return null;
  const dt = (sample.timestamp - previous.timestamp) / 1000;
  if (dt <= 0) return null;
  const dist = distanceMeters(previous.lat, previous.lng, sample.lat, sample.lng);
  return (dist / dt) * 3.6;
}

export function createDangerZoneDetector(zones: DangerZone[]) {
  const byId = new Map<string, DangerZone>();
  const grid = new Map<string, DangerZone[]>();

  for (const zone of zones) {
    if (zone.circles.length === 0) continue;
    byId.set(zone.id, zone);
    for (const circle of zone.circles) {
      const key = cellKey(circle.lat, circle.lng);
      const list = grid.get(key);
      if (list) {
        if (!list.includes(zone)) list.push(zone);
      } else {
        grid.set(key, [zone]);
      }
    }
  }

  const states = new Map<string, ZoneRuntime>();
  const history: ZoneSample[] = [];
  let prevHeading: number | null = null;

  function nearby(lat: number, lng: number): DangerZone[] {
    const y = Math.floor(lat / CELL);
    const x = Math.floor(lng / CELL);
    const seen = new Set<string>();
    const found: DangerZone[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const list = grid.get(`${y + dy}:${x + dx}`);
        if (!list) continue;
        for (const zone of list) {
          if (seen.has(zone.id)) continue;
          seen.add(zone.id);
          found.push(zone);
        }
      }
    }
    for (const [id, state] of states) {
      if (state.phase === "in" && !seen.has(id)) {
        const zone = byId.get(id);
        if (zone) found.push(zone);
      }
    }
    return found;
  }

  function activeOf(): ActiveDangerZone | null {
    let best: ActiveDangerZone | null = null;
    for (const [id, state] of states) {
      if (state.phase !== "in") continue;
      const candidate: ActiveDangerZone = {
        zoneId: id,
        vma: state.vma,
        speeding: state.speeding,
      };
      if (!best || (candidate.vma ?? Infinity) < (best.vma ?? Infinity)) best = candidate;
    }
    return best;
  }

  function dropInsideSilently() {
    for (const state of states.values()) {
      if (state.phase === "in") {
        state.phase = "out";
        state.alerted = false;
        state.insideStreak = 0;
        state.outsideStreak = 0;
        state.speeding = false;
      }
    }
  }

  function update(sample: ZoneSample): DetectorUpdate {
    const previous = history.length > 0 ? history[history.length - 1] : null;

    if (previous && sample.timestamp - previous.timestamp > GPS_LOSS_MS) {
      dropInsideSilently();
      history.length = 0;
      history.push(sample);
      prevHeading = null;
      return { events: [], active: activeOf() };
    }

    if (previous) {
      const dist = distanceMeters(previous.lat, previous.lng, sample.lat, sample.lng);
      const dt = (sample.timestamp - previous.timestamp) / 1000;
      const implied = dt > 0 ? (dist / dt) * 3.6 : dist >= 5 ? Number.POSITIVE_INFINITY : 0;
      const heading =
        dist > 1 ? bearingDegrees(previous.lat, previous.lng, sample.lat, sample.lng) : null;
      const sharpTurn =
        prevHeading != null &&
        heading != null &&
        dist >= JUMP_DISTANCE_M &&
        headingDeltaDegrees(prevHeading, heading) > JUMP_HEADING_DEG;
      if (implied > JUMP_SPEED_KMH || sharpTurn) {
        for (const state of states.values()) {
          state.insideStreak = 0;
          state.outsideStreak = 0;
        }
        history.length = 0;
        history.push(sample);
        prevHeading = null;
        return { events: [], active: activeOf() };
      }
      if (dt <= 0 && dist < 5) {
        return { events: [], active: activeOf() };
      }
      if (heading != null) prevHeading = heading;
    }

    const speed = speedKmhOf(sample, previous);
    const candidates = nearby(sample.lat, sample.lng);
    const candidateIds = new Set(candidates.map((zone) => zone.id));
    for (const [id, state] of states) {
      if (state.phase === "out" && !candidateIds.has(id)) {
        state.insideStreak = 0;
        if (state.cooldownUntil <= sample.timestamp) states.delete(id);
      }
    }

    const events: DangerZoneEvent[] = [];

    for (const zone of candidates) {
      const inside: DangerCircle[] = [];
      let beyond = true;
      for (const circle of zone.circles) {
        const dist = distanceMeters(sample.lat, sample.lng, circle.lat, circle.lng);
        if (dist <= circle.radiusM) inside.push(circle);
        if (dist <= circle.radiusM + EXIT_MARGIN_M) beyond = false;
      }

      const state = states.get(zone.id) ?? blankState();

      if (state.phase === "out") {
        if (inside.length > 0 && speed != null && speed > ENTER_SPEED_KMH) {
          state.insideStreak += 1;
          state.vma = vmaOf(inside);
          if (state.insideStreak >= CONFIRM_POINTS) {
            state.phase = "in";
            state.outsideStreak = 0;
            state.insideStreak = 0;
            state.speeding = state.vma != null && speed > state.vma + 4;
            if (sample.timestamp >= state.cooldownUntil) {
              state.alerted = true;
              state.cooldownUntil = sample.timestamp + COOLDOWN_MS;
              events.push({ type: "enter", zoneId: zone.id, vma: state.vma });
            } else {
              state.alerted = false;
            }
          }
        } else {
          state.insideStreak = 0;
        }
      } else if (inside.length > 0) {
        state.vma = vmaOf(inside);
        state.outsideStreak = 0;
        if (state.vma != null && speed != null) {
          state.speeding = state.speeding ? speed > state.vma - 2 : speed > state.vma + 4;
        } else {
          state.speeding = false;
        }
      } else if (beyond) {
        state.outsideStreak += 1;
        state.speeding = false;
        if (state.outsideStreak >= CONFIRM_POINTS) {
          const alerted = state.alerted;
          const vma = state.vma;
          state.phase = "out";
          state.alerted = false;
          state.outsideStreak = 0;
          state.insideStreak = 0;
          if (alerted) events.push({ type: "exit", zoneId: zone.id, vma });
        }
      } else {
        state.outsideStreak = 0;
        state.speeding = false;
      }

      if (
        state.phase === "out" &&
        state.insideStreak === 0 &&
        state.cooldownUntil <= sample.timestamp
      ) {
        states.delete(zone.id);
      } else {
        states.set(zone.id, state);
      }
    }

    history.push(sample);
    if (history.length > 3) history.shift();

    return { events, active: activeOf() };
  }

  function serialize(now: number): DetectorPersist {
    const persisted: DetectorPersist["zones"] = [];
    for (const [id, state] of states) {
      if (state.phase === "in" || state.cooldownUntil > now) {
        persisted.push({
          id,
          phase: state.phase,
          cooldownUntil: state.cooldownUntil,
          alerted: state.alerted,
          vma: state.vma,
        });
      }
    }
    return { savedAt: now, zones: persisted };
  }

  function hydrate(saved: DetectorPersist | null, now: number) {
    states.clear();
    history.length = 0;
    prevHeading = null;
    if (!saved) return;
    const fresh = now - saved.savedAt <= GPS_LOSS_MS;
    for (const zone of saved.zones) {
      if (!byId.has(zone.id)) continue;
      if (zone.cooldownUntil <= now && zone.phase !== "in") continue;
      const state = blankState();
      state.cooldownUntil = zone.cooldownUntil;
      state.vma = zone.vma;
      if (zone.phase === "in" && fresh) {
        state.phase = "in";
        state.alerted = zone.alerted;
      }
      states.set(zone.id, state);
    }
  }

  function reset() {
    states.clear();
    history.length = 0;
    prevHeading = null;
  }

  return { update, serialize, hydrate, reset, getActive: activeOf };
}

export type DangerZoneDetector = ReturnType<typeof createDangerZoneDetector>;
