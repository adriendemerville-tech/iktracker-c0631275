import { describe, expect, it } from "vitest";
import { COOLDOWN_MS, EXIT_MARGIN_M } from "./constants";
import { createDangerZoneDetector } from "./detector";
import { destinationPoint } from "./geometry";
import type { DangerZone, ZoneSample } from "./types";

function point(lat: number, lng: number, distanceM: number, bearingDeg: number) {
  return destinationPoint(lat, lng, distanceM, (bearingDeg * Math.PI) / 180);
}

function track(options: {
  lat: number;
  lng: number;
  bearing: number;
  speedKmh: number;
  stepM: number;
  steps: number;
  startMs?: number;
  speedMps?: number | null;
}): ZoneSample[] {
  const samples: ZoneSample[] = [];
  let lat = options.lat;
  let lng = options.lng;
  let time = options.startMs ?? 0;
  const dt = (options.stepM / (options.speedKmh / 3.6)) * 1000;
  for (let index = 0; index < options.steps; index++) {
    samples.push({
      lat,
      lng,
      timestamp: Math.round(time),
      speedMps: options.speedMps === undefined ? options.speedKmh / 3.6 : options.speedMps,
    });
    const next = point(lat, lng, options.stepM, options.bearing);
    lat = next.lat;
    lng = next.lng;
    time += dt;
  }
  return samples;
}

function run(zone: DangerZone, samples: ZoneSample[]) {
  const detector = createDangerZoneDetector([zone]);
  const events = samples.flatMap((sample) => detector.update(sample).events);
  return { detector, events };
}

const center = { lat: 45, lng: 1 };
const zone: DangerZone = {
  id: "zone-a",
  circles: [{ ...center, radiusM: 200, vma: 80 }],
};

function approach(startMs = 0, speedKmh = 50) {
  const start = point(center.lat, center.lng, 600, 0);
  return track({
    ...start,
    bearing: 180,
    speedKmh,
    stepM: 20,
    steps: 80,
    startMs,
  });
}

describe("entrée et sortie de zone", () => {
  it("joue une entrée puis une sortie, une seule fois par traversée", () => {
    const { events } = run(zone, approach());
    expect(events.map((event) => event.type)).toEqual(["enter", "exit"]);
    expect(events[0].vma).toBe(80);
    expect(events[1].zoneId).toBe("zone-a");
  });

  it("attend deux positions consécutives dans la zone", () => {
    const first = point(center.lat, center.lng, 50, 0);
    const outside = point(center.lat, center.lng, 250, 0);
    const back = point(center.lat, center.lng, 180, 0);
    const deeper = point(center.lat, center.lng, 120, 0);
    const samples: ZoneSample[] = [
      { lat: first.lat, lng: first.lng, speedMps: 15, timestamp: 0 },
      { lat: outside.lat, lng: outside.lng, speedMps: 15, timestamp: 15_000 },
      { lat: back.lat, lng: back.lng, speedMps: 15, timestamp: 30_000 },
      { lat: deeper.lat, lng: deeper.lng, speedMps: 15, timestamp: 40_000 },
    ];
    const { events } = run(zone, samples);
    expect(events.map((event) => event.type)).toEqual(["enter"]);
  });

  it("ne sort pas dans la bande d'hystérésis, seulement au-delà", () => {
    const detector = createDangerZoneDetector([zone]);
    const inside = { lat: center.lat, lng: center.lng, speedMps: 15 };
    detector.update({ ...inside, timestamp: 0 });
    detector.update({ ...inside, timestamp: 1000 });
    const band = point(center.lat, center.lng, 200 + EXIT_MARGIN_M - 40, 180);
    const first = detector.update({
      lat: band.lat,
      lng: band.lng,
      speedMps: 15,
      timestamp: 30_000,
    });
    expect(first.events).toEqual([]);
    expect(first.active?.zoneId).toBe("zone-a");

    const clear = point(center.lat, center.lng, 200 + EXIT_MARGIN_M + 80, 180);
    const further = point(center.lat, center.lng, 200 + EXIT_MARGIN_M + 140, 180);
    const leaving = [
      detector.update({ lat: clear.lat, lng: clear.lng, speedMps: 15, timestamp: 60_000 }),
      detector.update({ lat: further.lat, lng: further.lng, speedMps: 15, timestamp: 70_000 }),
    ];
    expect(leaving.flatMap((update) => update.events).map((event) => event.type)).toEqual(["exit"]);
  });

  it("ne signale pas une zone quand la vitesse reste basse", () => {
    const { events } = run(zone, approach(0, 15));
    expect(events).toEqual([]);
  });

  it("utilise la vitesse fournie par le téléphone plutôt que la distance entre points", () => {
    const inside = { lat: center.lat, lng: center.lng };
    const slowDevice: ZoneSample[] = [
      { ...inside, timestamp: 0, speedMps: 1 },
      { ...point(center.lat, center.lng, 40, 90), timestamp: 1000, speedMps: 1 },
    ];
    expect(run(zone, slowDevice).events).toEqual([]);

    const fastDevice: ZoneSample[] = [
      { ...inside, timestamp: 0, speedMps: 20 },
      { ...point(center.lat, center.lng, 5, 90), timestamp: 2000, speedMps: 20 },
    ];
    expect(run(zone, fastDevice).events.map((event) => event.type)).toEqual(["enter"]);
  });
});

describe("anti-spam", () => {
  it("ne redéclenche pas la même zone avant 5 minutes", () => {
    const first = approach(0, 50);
    const last = first[first.length - 1];
    const back = track({
      lat: last.lat,
      lng: last.lng,
      bearing: 0,
      speedKmh: 50,
      stepM: 20,
      steps: 80,
      startMs: last.timestamp + 1500,
    });
    const { events } = run(zone, [...first, ...back]);
    expect(events.filter((event) => event.type === "enter")).toHaveLength(1);
    expect(events.filter((event) => event.type === "exit")).toHaveLength(1);
  });

  it("autorise une nouvelle entrée une fois le délai passé", () => {
    const detector = createDangerZoneDetector([zone]);
    const first = approach(0, 50);
    const firstEvents = first.flatMap((sample) => detector.update(sample).events);
    expect(firstEvents.map((event) => event.type)).toEqual(["enter", "exit"]);

    const again = approach(firstEvents.length > 0 ? COOLDOWN_MS + 120_000 : 0, 50);
    const second = again.flatMap((sample) => detector.update(sample).events);
    expect(second.map((event) => event.type)).toEqual(["enter", "exit"]);
  });

  it("ignore un saut GPS et ne compte pas ce point comme une entrée", () => {
    const detector = createDangerZoneDetector([zone]);
    const outside = point(center.lat, center.lng, 800, 90);
    expect(
      detector.update({ lat: outside.lat, lng: outside.lng, timestamp: 0, speedMps: 15 }).events,
    ).toEqual([]);
    const jumped = detector.update({
      lat: center.lat,
      lng: center.lng,
      timestamp: 1000,
      speedMps: 15,
    });
    const next = detector.update({
      lat: center.lat,
      lng: center.lng,
      timestamp: 2000,
      speedMps: 15,
    });
    expect(jumped.events).toEqual([]);
    expect(next.events).toEqual([]);
  });

  it("sort en silence si le GPS disparaît plus d'une minute", () => {
    const detector = createDangerZoneDetector([zone]);
    const inside = { lat: center.lat, lng: center.lng, speedMps: 15 };
    detector.update({ ...inside, timestamp: 0 });
    const entered = detector.update({ ...inside, timestamp: 1000 });
    expect(entered.events.map((event) => event.type)).toEqual(["enter"]);
    const lost = detector.update({
      lat: center.lat + 0.05,
      lng: center.lng,
      timestamp: 62_000,
      speedMps: 15,
    });
    expect(lost.events).toEqual([]);
    expect(lost.active).toBeNull();
  });

  it("retient l'entrée déjà signalée après rechargement, sans la rejouer", () => {
    const first = createDangerZoneDetector([zone]);
    const inside = { lat: center.lat, lng: center.lng, speedMps: 15 };
    first.update({ ...inside, timestamp: 1_000 });
    first.update({ ...inside, timestamp: 2_000 });
    const saved = first.serialize(2_000);

    const second = createDangerZoneDetector([zone]);
    second.hydrate(saved, 10_000);
    const still = second.update({ ...inside, timestamp: 11_000 });
    expect(still.events).toEqual([]);
    expect(still.active?.zoneId).toBe("zone-a");

    const clear = point(center.lat, center.lng, 200 + EXIT_MARGIN_M + 80, 180);
    const further = point(center.lat, center.lng, 200 + EXIT_MARGIN_M + 140, 180);
    second.update({ lat: clear.lat, lng: clear.lng, speedMps: 15, timestamp: 40_000 });
    const left = second.update({
      lat: further.lat,
      lng: further.lng,
      speedMps: 15,
      timestamp: 50_000,
    });
    expect(left.events.map((event) => event.type)).toEqual(["exit"]);
  });

  it("ne rejoue pas l'entrée si le GPS manquait depuis plus d'une minute", () => {
    const first = createDangerZoneDetector([zone]);
    const inside = { lat: center.lat, lng: center.lng, speedMps: 15 };
    first.update({ ...inside, timestamp: 0 });
    first.update({ ...inside, timestamp: 1000 });
    const saved = first.serialize(1000);
    const second = createDangerZoneDetector([zone]);
    second.hydrate({ ...saved, savedAt: 1_000 }, 70_000);
    const again = second.update({ ...inside, timestamp: 71_000 });
    const still = second.update({ ...inside, timestamp: 72_000 });
    expect([...again.events, ...still.events]).toEqual([]);
  });
});

describe("zones fusionnées", () => {
  it("ne fait qu'une entrée et une sortie pour deux cercles qui se chevauchent", () => {
    const other = point(center.lat, center.lng, 100, 90);
    const merged: DangerZone = {
      id: "merged",
      circles: [
        { ...center, radiusM: 200, vma: 50 },
        { lat: other.lat, lng: other.lng, radiusM: 200, vma: 30 },
      ],
    };
    const start = point(center.lat, center.lng, 500, 270);
    const samples = track({
      ...start,
      bearing: 90,
      speedKmh: 40,
      stepM: 20,
      steps: 60,
    });
    const { events } = run(merged, samples);
    expect(events.map((event) => event.type)).toEqual(["enter", "exit"]);
    expect(events[0].vma).toBe(50);
  });
});
