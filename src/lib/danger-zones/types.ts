export interface DangerCircle {
  lat: number;
  lng: number;
  radiusM: number;
  vma: number | null;
}

export interface DangerZone {
  id: string;
  circles: DangerCircle[];
}

export interface SourceRow {
  id: string;
  type: string;
  vma: number | null;
  lat: number;
  lng: number;
}

export interface DangerZoneBanner {
  phase: "inside" | "leaving";
  vma: number | null;
  speeding: boolean;
}

export interface ZoneSample {
  lat: number;
  lng: number;
  timestamp: number;
  /** Metres per second from the device, when it provides one. */
  speedMps: number | null;
}

export interface DangerZoneEvent {
  type: "enter" | "exit";
  zoneId: string;
  vma: number | null;
}

export interface ActiveDangerZone {
  zoneId: string;
  vma: number | null;
  speeding: boolean;
}

export interface DetectorPersistZone {
  id: string;
  phase: "in" | "out";
  cooldownUntil: number;
  alerted: boolean;
  vma: number | null;
}

export interface DetectorPersist {
  savedAt: number;
  zones: DetectorPersistZone[];
}
