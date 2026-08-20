import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// Google Maps API key for distance calculation
const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");

// Default start location for calendar-detected trips
const DEFAULT_START_LOCATION = "Maison";

interface CalendarEvent {
  id: string;
  summary?: string;
  location?: string;
  description?: string;
  hangoutLink?: string;
  conferenceData?: any;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  // Google Calendar API v3 fields — used by the deterministic Level 1 filter
  eventType?: string; // 'default' | 'birthday' | 'focusTime' | 'outOfOffice' | 'workingLocation' | 'fromGmail'
  transparency?: string; // 'opaque' (busy) | 'transparent' (free)
  status?: string; // 'confirmed' | 'tentative' | 'cancelled'
  attendees?: Array<{ self?: boolean; responseStatus?: string }>;
  organizer?: { self?: boolean; email?: string };
  recurringEventId?: string;
}

// Detect virtual meeting markers (Meet, Zoom, Teams, Webex, visio, etc.)
const VIRTUAL_MEETING_REGEX =
  /\b(?:meet\.google\.com|zoom\.us|zoom\.com|teams\.microsoft\.com|teams\.live\.com|webex\.com|gotomeeting\.com|whereby\.com|bluejeans\.com|jitsi|meet\.jit\.si|discord\.gg|skype:|hangouts\.google\.com|around\.co|around\.us|slack\.com\/call|framatalk|8x8\.vc|livestorm|demio\.com|livewebinar|clickmeeting|bigbluebutton|livekit)\b|\bvisio(?:conf[eé]rence)?\b|\bvis[ié]o\b|\ben\s+visio\b|\bvisioconf/i;

function isVirtualMeeting(event: CalendarEvent): boolean {
  if (event.hangoutLink) return true;
  if (event.conferenceData?.entryPoints?.length) return true;
  const haystack = `${event.location || ""} ${event.description || ""} ${event.summary || ""}`;
  return VIRTUAL_MEETING_REGEX.test(haystack);
}

// ============ Level 1 deterministic filter =============
// Signals from Google Calendar API v3 + RFC 5545 (ICS), NOT from event title semantics.
// Docs: https://developers.google.com/calendar/api/v3/reference/events#resource
// - eventType 'birthday' | 'focusTime' | 'outOfOffice' | 'workingLocation' | 'fromGmail' are non-meeting types
// - transparency 'transparent' = free/OOO, not a business appointment
// - all-day event without a location = personal marker (anniversaire, jour férié, congé, prénom)
// - status 'cancelled' = ignore
// - location matching user's home address = 0-km trip
function normalizeAddress(s: string | undefined | null): string {
  return (s || "")
    .toLowerCase()
    .replace(/[\s,;.'"\-]+/g, " ")
    .trim();
}

function normalizeDedupeText(value: string | undefined | null): string {
  const from = "ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝýÿ'’`.-,;";
  const to = "AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOOooooooUUUUuuuuYyy      ";
  const normalized = (value || "")
    .split("")
    .map((char) => {
      const index = from.indexOf(char);
      return index >= 0 ? to[index] : char;
    })
    .join("")
    .toLowerCase()
    .replace(/chemin/g, "chem")
    .replace(/route/g, "rte")
    .replace(/avenue/g, "av")
    .replace(/france/g, "");

  return normalized.replace(/[^a-z0-9]+/g, "");
}

function shouldSkipEvent(
  event: CalendarEvent,
  userHomeLocation: { address: string; name: string } | null,
): string | null {
  // 1) Cancelled events
  if (event.status === "cancelled") return "status_cancelled";

  // 2) Google eventType is a strong deterministic signal
  const et = event.eventType;
  if (et && et !== "default") {
    // birthday (Google Contacts), focusTime, outOfOffice, workingLocation, fromGmail
    return `event_type_${et}`;
  }

  // 3) Transparent (marked "free") events are never business appointments
  if (event.transparency === "transparent") return "transparency_free";

  // 3bis) Virtual meeting (Meet / Zoom / Teams / visio) → never a physical trip
  if (isVirtualMeeting(event)) return "virtual_meeting";

  const isAllDay = !!event.start?.date && !event.start?.dateTime;
  const hasLocation = !!(event.location && event.location.trim().length > 0);

  // 4) All-day event without a location — universal marker for
  //    anniversaires, jours fériés, congés, jours de nom, événements perso récurrents.
  //    Un vrai RDV client est toujours horodaté (dateTime).
  if (isAllDay && !hasLocation) return "all_day_no_location";

  // 5) Location = home address → 0 km trip, always skipped
  if (hasLocation && userHomeLocation?.address) {
    const loc = normalizeAddress(event.location);
    const home = normalizeAddress(userHomeLocation.address);
    if (loc && home && (loc === home || loc.includes(home) || home.includes(loc))) {
      return "location_equals_home";
    }
  }

  return null;
}

interface CalendarConnection {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
}

// Refresh Google access token if expired
async function refreshGoogleToken(
  connection: CalendarConnection,
  supabase: any,
): Promise<string | null> {
  if (!connection.refresh_token) {
    console.log(`No refresh token for connection ${connection.id}`);
    return null;
  }

  // Check if token is expired
  if (connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at);
    if (expiresAt > new Date()) {
      return connection.access_token; // Token still valid
    }
  }

  console.log(`Refreshing token for connection ${connection.id}`);

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        refresh_token: connection.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error(
        `Failed to refresh token for connection ${connection.id}:`,
        await response.text(),
      );
      return null;
    }

    const tokens = await response.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Update token in database
    await supabase
      .from("calendar_connections")
      .update({
        access_token: tokens.access_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    return tokens.access_token;
  } catch (error) {
    console.error(`Error refreshing token for connection ${connection.id}:`, error);
    return null;
  }
}

// Calculate date range for calendar sync
// Default (monthsBack=0): today only + 14 days ahead (prevents re-importing archived trips)
// With monthsBack > 0: allows importing past events for manual sync
function getCalendarSyncDateRange(monthsBack: number = 0): { startDate: Date; endDate: Date } {
  const now = new Date();

  let startDate: Date;
  if (monthsBack > 0) {
    // User explicitly requested past import - go back X months
    startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1, 0, 0, 0);
  } else {
    // Default: start from today at midnight (no past import)
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  }

  // End window: 14 days from today
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14, 23, 59, 59);

  return { startDate, endDate };
}

// Fetch Google Calendar events based on monthsBack parameter
async function fetchGoogleCalendarEvents(
  accessToken: string,
  monthsBack: number = 0,
): Promise<{ events: CalendarEvent[]; dateRange: { startDate: string; endDate: string } }> {
  const { startDate, endDate } = getCalendarSyncDateRange(monthsBack);

  const params = new URLSearchParams({
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "500",
  });
  // Ask Google to already exclude non-meeting event types (birthday, focusTime, outOfOffice, workingLocation, fromGmail).
  // Ref: https://developers.google.com/calendar/api/v3/reference/events/list#eventTypes
  params.append("eventTypes", "default");

  console.log(
    `Fetching Google Calendar events from ${startDate.toISOString()} to ${endDate.toISOString()} (monthsBack=${monthsBack})`,
  );

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to fetch calendar events:", response.status, errorText);
    return {
      events: [],
      dateRange: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
    };
  }

  const data = await response.json();
  console.log(`Fetched ${data.items?.length || 0} raw events from Google Calendar`);
  return {
    events: data.items || [],
    dateRange: {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    },
  };
}

// ============ ICS Parsing (RFC 5545, pragmatic subset) ============

function unfoldICS(text: string): string[] {
  const rawLines = text.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function unescapeICSText(v: string): string {
  return v
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function parseICSDate(value: string): Date | null {
  if (!value) return null;
  const s = value.trim();
  if (/^\d{8}$/.test(s)) {
    return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00Z`);
  }
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m;
  // Best-effort: treat naive/TZID as UTC. Sync window is 14 days so small TZ drift is harmless.
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${se}Z`);
}

interface ICSRawEvent {
  uid: string;
  summary: string;
  location: string;
  description: string;
  start: Date;
  end: Date;
  allDay: boolean;
  rrule?: string;
  exdates: Date[];
  transp?: string; // TRANSP: OPAQUE | TRANSPARENT (RFC 5545 §3.8.2.7)
  status?: string; // STATUS: CONFIRMED | TENTATIVE | CANCELLED (RFC 5545 §3.8.1.11)
}

function parseICS(text: string): ICSRawEvent[] {
  const lines = unfoldICS(text);
  const events: ICSRawEvent[] = [];
  let current: Partial<ICSRawEvent> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = { exdates: [] };
      continue;
    }
    if (line === "END:VEVENT") {
      if (current && current.uid && current.start && current.end) {
        events.push({
          uid: current.uid,
          summary: current.summary || "",
          location: current.location || "",
          description: current.description || "",
          start: current.start,
          end: current.end,
          allDay: current.allDay || false,
          rrule: current.rrule,
          exdates: current.exdates || [],
          transp: current.transp,
          status: current.status,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx < 0) continue;
    const keyPart = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1);
    const [prop, ...paramPairs] = keyPart.split(";");
    const params: Record<string, string> = {};
    for (const p of paramPairs) {
      const [k, v] = p.split("=");
      if (k && v) params[k.toUpperCase()] = v;
    }

    switch (prop.toUpperCase()) {
      case "UID":
        current.uid = value.trim();
        break;
      case "SUMMARY":
        current.summary = unescapeICSText(value);
        break;
      case "LOCATION":
        current.location = unescapeICSText(value);
        break;
      case "DESCRIPTION":
        current.description = unescapeICSText(value);
        break;
      case "DTSTART": {
        const d = parseICSDate(value);
        if (d) current.start = d;
        current.allDay = params.VALUE === "DATE";
        break;
      }
      case "DTEND": {
        const d = parseICSDate(value);
        if (d) current.end = d;
        break;
      }
      case "RRULE":
        current.rrule = value.trim();
        break;
      case "TRANSP":
        current.transp = value.trim().toUpperCase();
        break;
      case "STATUS":
        current.status = value.trim().toUpperCase();
        break;
      case "EXDATE": {
        for (const part of value.split(",")) {
          const d = parseICSDate(part);
          if (d) current.exdates!.push(d);
        }
        break;
      }
    }
  }
  return events;
}

function expandRRULE(event: ICSRawEvent, windowStart: Date, windowEnd: Date): Date[] {
  const rule: Record<string, string> = {};
  for (const part of (event.rrule || "").split(";")) {
    const [k, v] = part.split("=");
    if (k && v) rule[k.toUpperCase()] = v;
  }
  const freq = rule.FREQ;
  if (!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) return [];
  const interval = Math.max(1, parseInt(rule.INTERVAL || "1", 10));
  const count = rule.COUNT ? parseInt(rule.COUNT, 10) : Infinity;
  const until = rule.UNTIL ? parseICSDate(rule.UNTIL) : null;
  const exSet = new Set(event.exdates.map((d) => d.toISOString().slice(0, 10)));

  const stopAt = until && until.getTime() < windowEnd.getTime() ? until : windowEnd;
  const occurrences: Date[] = [];
  const cur = new Date(event.start.getTime());
  let emitted = 0;
  let iter = 0;
  const MAX_ITER = 1000;

  while (cur.getTime() <= stopAt.getTime() && emitted < count && iter++ < MAX_ITER) {
    if (cur.getTime() >= windowStart.getTime() && cur.getTime() <= windowEnd.getTime()) {
      const dayKey = cur.toISOString().slice(0, 10);
      if (!exSet.has(dayKey)) occurrences.push(new Date(cur.getTime()));
    }
    emitted++;
    if (freq === "DAILY") cur.setUTCDate(cur.getUTCDate() + interval);
    else if (freq === "WEEKLY") cur.setUTCDate(cur.getUTCDate() + 7 * interval);
    else if (freq === "MONTHLY") cur.setUTCMonth(cur.getUTCMonth() + interval);
    else if (freq === "YEARLY") cur.setUTCFullYear(cur.getUTCFullYear() + interval);
  }
  return occurrences;
}

async function fetchICSEvents(
  icsUrl: string,
  monthsBack: number = 0,
): Promise<{ events: CalendarEvent[]; dateRange: { startDate: string; endDate: string } }> {
  const { startDate, endDate } = getCalendarSyncDateRange(monthsBack);
  const emptyRange = {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };

  try {
    const response = await fetch(icsUrl, {
      headers: { "User-Agent": "IKTracker/1.0 (+https://iktracker.fr)" },
      redirect: "follow",
    });
    if (!response.ok) {
      console.error(`ICS fetch failed [${response.status}] for ${icsUrl}`);
      return { events: [], dateRange: emptyRange };
    }
    const text = await response.text();
    const raw = parseICS(text);
    console.log(`Parsed ${raw.length} raw VEVENTs from ICS`);

    const events: CalendarEvent[] = [];
    for (const ev of raw) {
      const occurrences = ev.rrule
        ? expandRRULE(ev, startDate, endDate)
        : ev.start.getTime() >= startDate.getTime() && ev.start.getTime() <= endDate.getTime()
          ? [ev.start]
          : [];

      const duration = Math.max(0, ev.end.getTime() - ev.start.getTime());
      for (const occ of occurrences) {
        const endOcc = new Date(occ.getTime() + duration);
        const id = ev.rrule ? `${ev.uid}_${occ.toISOString().slice(0, 10)}` : ev.uid;
        events.push({
          id,
          summary: ev.summary,
          location: ev.location,
          description: ev.description,
          start: ev.allDay
            ? { date: occ.toISOString().slice(0, 10) }
            : { dateTime: occ.toISOString() },
          end: ev.allDay
            ? { date: endOcc.toISOString().slice(0, 10) }
            : { dateTime: endOcc.toISOString() },
          transparency:
            ev.transp === "TRANSPARENT"
              ? "transparent"
              : ev.transp === "OPAQUE"
                ? "opaque"
                : undefined,
          status: ev.status ? ev.status.toLowerCase() : undefined,
        });
      }
    }
    console.log(`Expanded to ${events.length} event occurrences in window`);
    return { events, dateRange: emptyRange };
  } catch (err) {
    console.error("ICS fetch/parse error:", err);
    return { events: [], dateRange: emptyRange };
  }
}

// IK Barème 2024 (same as frontend)
interface IKBareme {
  cv: string;
  upTo5000: { rate: number };
  from5001To20000: { rate: number; fixed: number };
  over20000: { rate: number };
}

const IK_BAREME_2024: IKBareme[] = [
  {
    cv: "3",
    upTo5000: { rate: 0.529 },
    from5001To20000: { rate: 0.316, fixed: 1065 },
    over20000: { rate: 0.37 },
  },
  {
    cv: "4",
    upTo5000: { rate: 0.606 },
    from5001To20000: { rate: 0.34, fixed: 1330 },
    over20000: { rate: 0.407 },
  },
  {
    cv: "5",
    upTo5000: { rate: 0.636 },
    from5001To20000: { rate: 0.357, fixed: 1395 },
    over20000: { rate: 0.427 },
  },
  {
    cv: "6",
    upTo5000: { rate: 0.665 },
    from5001To20000: { rate: 0.374, fixed: 1457 },
    over20000: { rate: 0.447 },
  },
  {
    cv: "7+",
    upTo5000: { rate: 0.697 },
    from5001To20000: { rate: 0.394, fixed: 1515 },
    over20000: { rate: 0.47 },
  },
];

function getIKBareme(fiscalPower: number): IKBareme {
  if (fiscalPower <= 3) return IK_BAREME_2024[0];
  if (fiscalPower === 4) return IK_BAREME_2024[1];
  if (fiscalPower === 5) return IK_BAREME_2024[2];
  if (fiscalPower === 6) return IK_BAREME_2024[3];
  return IK_BAREME_2024[4];
}

type IKRateOverride = "auto" | "tier2" | "tier3";

function calculateTotalAnnualIK(
  totalAnnualKm: number,
  fiscalPower: number,
  override: IKRateOverride = "auto",
): number {
  const bareme = getIKBareme(fiscalPower);
  if (override === "tier2") return totalAnnualKm * bareme.from5001To20000.rate;
  if (override === "tier3") return totalAnnualKm * bareme.over20000.rate;
  if (totalAnnualKm <= 5000) {
    return totalAnnualKm * bareme.upTo5000.rate;
  } else if (totalAnnualKm <= 20000) {
    return totalAnnualKm * bareme.from5001To20000.rate + bareme.from5001To20000.fixed;
  } else {
    return totalAnnualKm * bareme.over20000.rate;
  }
}

interface VehicleInfo {
  id: string;
  fiscal_power: number;
  is_electric: boolean;
}

// Get user's default vehicle: if only one vehicle, use it; otherwise use last used from trips
async function getUserLastUsedVehicle(userId: string, supabase: any): Promise<VehicleInfo | null> {
  // First, get all user's vehicles
  const { data: allVehicles } = await supabase
    .from("vehicles")
    .select("id, fiscal_power, is_electric")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!allVehicles || allVehicles.length === 0) {
    return null;
  }

  // If only one vehicle, use it directly
  if (allVehicles.length === 1) {
    console.log(`User has only 1 vehicle, using it: ${allVehicles[0].id}`);
    return allVehicles[0];
  }

  // Multiple vehicles: try to get the one from the most recent trip
  const { data: recentTrip } = await supabase
    .from("trips")
    .select("vehicle_id")
    .eq("user_id", userId)
    .not("vehicle_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const lastVehicleId = recentTrip?.[0]?.vehicle_id;

  if (lastVehicleId) {
    const lastVehicle = allVehicles.find((v: VehicleInfo) => v.id === lastVehicleId);
    if (lastVehicle) {
      console.log(`Using last used vehicle: ${lastVehicle.id}`);
      return lastVehicle;
    }
  }

  // Fallback: use the most recently created vehicle
  console.log(`Fallback to most recent vehicle: ${allVehicles[0].id}`);
  return allVehicles[0];
}

// Get total annual km for a vehicle in current year
async function getVehicleAnnualKm(
  userId: string,
  vehicleId: string,
  supabase: any,
): Promise<number> {
  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;
  const endOfYear = `${currentYear}-12-31`;

  const { data: trips } = await supabase
    .from("trips")
    .select("distance")
    .eq("user_id", userId)
    .eq("vehicle_id", vehicleId)
    .gte("date", startOfYear)
    .lte("date", endOfYear);

  return trips?.reduce((sum: number, t: { distance: number }) => sum + (t.distance || 0), 0) || 0;
}

// Get user's home/default location for distance calculation
// Returns both address (for distance calc) and name (for trip display)
async function getUserHomeLocation(
  userId: string,
  supabase: any,
): Promise<{ address: string; name: string } | null> {
  // Try to find a 'home' type location first
  const { data: homeLocation } = await supabase
    .from("locations")
    .select("address, name")
    .eq("user_id", userId)
    .eq("type", "home")
    .limit(1);

  if (homeLocation && homeLocation.length > 0 && homeLocation[0].address) {
    return {
      address: homeLocation[0].address,
      name: homeLocation[0].name || "Domicile",
    };
  }

  // Fallback: try to find an 'office' type location
  const { data: officeLocation } = await supabase
    .from("locations")
    .select("address, name")
    .eq("user_id", userId)
    .eq("type", "office")
    .limit(1);

  if (officeLocation && officeLocation.length > 0 && officeLocation[0].address) {
    return {
      address: officeLocation[0].address,
      name: officeLocation[0].name || "Bureau",
    };
  }

  return null;
}

// Calculate driving distance using Google Maps Distance Matrix API
async function calculateDrivingDistance(
  origin: string,
  destination: string,
): Promise<number | null> {
  try {
    const params = new URLSearchParams({
      origins: origin,
      destinations: destination,
      mode: "driving",
      language: "fr",
      key: GOOGLE_MAPS_API_KEY,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`,
    );

    if (!response.ok) {
      console.error("Distance Matrix API error:", response.status);
      return null;
    }

    const data = await response.json();

    if (data.status !== "OK") {
      console.error("Distance Matrix API status:", data.status, data.error_message);
      return null;
    }

    const element = data.rows?.[0]?.elements?.[0];
    if (element?.status === "OK" && element.distance?.value) {
      // Convert meters to kilometers, round to 1 decimal
      const distanceKm = Math.round(element.distance.value / 100) / 10;
      console.log(`📏 Distance calculated: ${origin} → ${destination} = ${distanceKm} km`);
      return distanceKm;
    }

    console.log(
      `⚠️ Could not calculate distance for: ${origin} → ${destination} (status: ${element?.status})`,
    );
    return null;
  } catch (error) {
    console.error("Error calculating distance:", error);
    return null;
  }
}

// Check if a trip already exists for this calendar event (including deleted ones)
async function tripExistsForEvent(
  userId: string,
  eventId: string,
  supabase: any,
): Promise<{ exists: boolean; wasDeleted: boolean }> {
  const { data } = await supabase
    .from("trips")
    .select("id, deleted_at")
    .eq("user_id", userId)
    .eq("calendar_event_id", eventId)
    .limit(1);

  if (!data || data.length === 0) {
    return { exists: false, wasDeleted: false };
  }

  // Trip exists - check if it was deleted (archived)
  const wasDeleted = data[0].deleted_at !== null;
  return { exists: true, wasDeleted };
}

// Check if a similar trip already exists (same date + similar destination) - includes archived trips
async function similarTripExists(
  userId: string,
  eventDate: string,
  destination: string,
  purpose: string | undefined,
  supabase: any,
): Promise<{ exists: boolean; wasDeleted: boolean }> {
  if (!destination) return { exists: false, wasDeleted: false };

  // Normalize destination for comparison (lowercase, trim)
  const normalizedDest = destination.toLowerCase().trim();
  const normalizedDestKey = normalizeDedupeText(destination);
  const normalizedPurposeKey = normalizeDedupeText(purpose);

  // Fetch all trips for this date (including archived ones)
  const { data: existingTrips } = await supabase
    .from("trips")
    .select("id, end_location, purpose, deleted_at, status")
    .eq("user_id", userId)
    .eq("date", eventDate);

  if (!existingTrips || existingTrips.length === 0) {
    return { exists: false, wasDeleted: false };
  }

  // Check for similar destinations
  for (const trip of existingTrips) {
    const tripDest = (trip.end_location || "").toLowerCase().trim();
    const tripDestKey = normalizeDedupeText(trip.end_location);
    const tripPurposeKey = normalizeDedupeText(trip.purpose);
    const isSamePendingCalendarEvent =
      trip.status === "pending_location" &&
      normalizedDestKey.length > 0 &&
      normalizedPurposeKey.length > 0 &&
      tripDestKey === normalizedDestKey &&
      tripPurposeKey === normalizedPurposeKey;

    // Check if destinations are similar (contains match or significant overlap)
    const isSimilar =
      isSamePendingCalendarEvent ||
      tripDest === normalizedDest ||
      tripDest.includes(normalizedDest) ||
      normalizedDest.includes(tripDest) ||
      // Also check city-level match (first significant word)
      (tripDest.split(",")[0]?.trim() === normalizedDest.split(",")[0]?.trim() &&
        tripDest.split(",")[0]?.trim().length > 3);

    if (isSimilar) {
      console.log(
        `🔍 Found similar trip: "${trip.end_location}" matches "${destination}" on ${eventDate}`,
      );
      return { exists: true, wasDeleted: trip.deleted_at !== null };
    }
  }

  return { exists: false, wasDeleted: false };
}

// Find matching keyword in frequent_destinations for event title
async function findFrequentDestination(
  userId: string,
  eventTitle: string,
  supabase: any,
): Promise<string | null> {
  if (!eventTitle) return null;

  // Get all user's frequent destinations
  const { data: destinations } = await supabase
    .from("frequent_destinations")
    .select("keyword, address")
    .eq("user_id", userId);

  if (!destinations || destinations.length === 0) return null;

  // Split title into words and check each against keywords (case-insensitive)
  const titleWords = eventTitle.toLowerCase().split(/\s+/);

  for (const dest of destinations) {
    const keyword = dest.keyword.toLowerCase();
    if (titleWords.some((word: string) => word.includes(keyword) || keyword.includes(word))) {
      console.log(
        `🔑 Found matching keyword "${dest.keyword}" for event "${eventTitle}" → ${dest.address}`,
      );
      return dest.address;
    }
  }

  return null;
}

// Create a trip from a calendar event
async function createTripFromEvent(
  userId: string,
  event: CalendarEvent,
  vehicle: VehicleInfo | null,
  userHomeLocation: { address: string; name: string } | null,
  supabase: any,
  source: string = "google_calendar",
  ikRateOverride: IKRateOverride = "auto",
): Promise<{ created: boolean; reason?: string; distanceCalculated?: boolean; pending?: boolean }> {
  // Log all events for debugging
  console.log(
    `Processing event: "${event.summary}" | location: "${event.location || "NONE"}" | id: ${event.id} | eventType: ${event.eventType || "default"} | transp: ${event.transparency || "opaque"}`,
  );

  // ===== Level 1 deterministic filter =====
  // Skip based on Google Calendar API v3 + RFC 5545 signals — never on title semantics.
  const skipReason = shouldSkipEvent(event, userHomeLocation);
  if (skipReason) {
    console.log(`⏭️ [FILTER L1] Skipping "${event.summary}" — ${skipReason}`);
    return { created: false, reason: skipReason };
  }

  // Check if trip already exists (including deleted/archived trips)
  const { exists, wasDeleted } = await tripExistsForEvent(userId, event.id, supabase);

  if (exists) {
    if (wasDeleted) {
      console.log(`⏭️ Trip was previously deleted for event "${event.summary}" - not re-importing`);
      return { created: false, reason: "previously_deleted" };
    }
    console.log(`⏭️ Trip already exists for event "${event.summary}"`);
    return { created: false, reason: "already_exists" };
  }

  // Get event date
  const eventDateTime = event.start.dateTime || event.start.date;
  if (!eventDateTime) {
    console.log(`⏭️ Skipping event "${event.summary}" - no start date`);
    return { created: false, reason: "no_start_date" };
  }

  const eventDate = new Date(eventDateTime).toISOString().split("T")[0];

  // Determine destination address
  let destinationAddress = event.location || "";
  let tripStatus = "validated";

  // If no location in event, try to find from frequent_destinations using title keywords
  if (!event.location) {
    const matchedAddress = await findFrequentDestination(userId, event.summary || "", supabase);
    if (matchedAddress) {
      destinationAddress = matchedAddress;
      console.log(`📍 Using frequent destination address: ${matchedAddress}`);
    } else {
      // No location and no keyword match - create as pending
      tripStatus = "pending_location";
      console.log(`⚠️ No location found, creating as pending: "${event.summary}"`);
    }
  }

  // Check for similar trips (same date + similar destination) - prevents duplicates with archived trips
  if (destinationAddress) {
    const { exists: similarExists, wasDeleted: similarWasDeleted } = await similarTripExists(
      userId,
      eventDate,
      destinationAddress,
      event.summary,
      supabase,
    );

    if (similarExists) {
      if (similarWasDeleted) {
        console.log(
          `⏭️ Similar archived trip found for "${event.summary}" on ${eventDate} - not re-importing`,
        );
        return { created: false, reason: "similar_archived" };
      }
      console.log(`⏭️ Similar trip already exists for "${event.summary}" on ${eventDate}`);
      return { created: false, reason: "similar_exists" };
    }
  }

  // Use home location name, or default to "Domicile"
  let startLocationName = userHomeLocation?.name || DEFAULT_START_LOCATION;

  // Try to calculate distance if we have both addresses
  let distance = 0;
  let distanceCalculated = false;

  // Log warning if home location is missing
  if (!userHomeLocation?.address) {
    console.log(`⚠️ No home address configured for user ${userId} - distance will be 0`);
  }

  if (tripStatus === "validated" && destinationAddress) {
    // Use home address if available, otherwise try using "Maison" as fallback
    const originAddress = userHomeLocation?.address;

    if (originAddress) {
      const calculatedDistance = await calculateDrivingDistance(originAddress, destinationAddress);
      if (calculatedDistance !== null && calculatedDistance > 0) {
        // Round trip = double the distance
        distance = calculatedDistance * 2;
        distanceCalculated = true;
        console.log(`📍 Auto-calculated round-trip distance: ${distance} km`);
      } else {
        // Distance calculation failed - mark as pending so user can fix it
        tripStatus = "pending_location";
        console.log(
          `⚠️ Distance calculation failed, marking as pending: ${originAddress} → ${destinationAddress}`,
        );
      }
    } else {
      // No home address - mark as pending so user knows they need to configure it
      tripStatus = "pending_location";
      console.log(`⚠️ No home address, marking as pending: "${event.summary}"`);
    }
  }

  // Calculate IK amount if we have a vehicle and distance
  let ikAmount = 0;
  if (vehicle && distance > 0) {
    const annualKm = await getVehicleAnnualKm(userId, vehicle.id, supabase);
    const newAnnualTotal = annualKm + distance;

    // Calculate incremental IK (what this trip adds to total)
    const ikBefore = calculateTotalAnnualIK(annualKm, vehicle.fiscal_power, ikRateOverride);
    const ikAfter = calculateTotalAnnualIK(newAnnualTotal, vehicle.fiscal_power, ikRateOverride);
    ikAmount = ikAfter - ikBefore;

    // Apply 20% bonus for electric vehicles
    if (vehicle.is_electric) {
      ikAmount *= 1.2;
    }

    ikAmount = Math.round(ikAmount * 100) / 100;
    console.log(`💰 IK calculated: ${ikAmount}€ (annual km: ${annualKm} → ${newAnnualTotal})`);
  }

  // Create the trip - use actual address for start_location to enable proper distance calculation
  // Use the real address if available, fall back to name for display purposes
  const startLocationValue = userHomeLocation?.address || startLocationName;
  const endLocationValue = destinationAddress || event.summary || "Adresse à compléter";

  // Skip events where start and end addresses are the same (0 km trip, no travel)
  const normalizeAddr = (s: string) =>
    s
      .toLowerCase()
      .replace(/[,.\-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  if (
    startLocationValue &&
    endLocationValue &&
    normalizeAddr(startLocationValue) === normalizeAddr(endLocationValue)
  ) {
    console.log(`⏭️ [FILTER] Same start/end address for "${event.summary}" — skipping`);
    return { created: false, reason: "same_start_end" };
  }

  const { error } = await supabase.from("trips").insert({
    user_id: userId,
    vehicle_id: vehicle?.id || null,
    start_location: startLocationValue,
    end_location: endLocationValue,
    distance: distance,
    round_trip: true,
    purpose: event.summary || "Rendez-vous calendrier",
    date: eventDate,
    ik_amount: ikAmount,
    source: source,
    calendar_event_id: event.id,
    status: tripStatus,
  });

  if (error) {
    console.error(`❌ Failed to create trip for event "${event.summary}":`, error);
    return { created: false, reason: "db_error" };
  }

  if (tripStatus === "pending_location") {
    console.log(`🕐 Created PENDING trip for event "${event.summary}" (no address)`);
    return { created: true, pending: true };
  }

  console.log(
    `✅ Created trip for event "${event.summary}" to ${destinationAddress} on ${eventDate} (vehicle: ${vehicle?.id || "none"}, distance: ${distance}km, ik: ${ikAmount}€)`,
  );
  return { created: true, distanceCalculated };
}

async function logCalendarAttempt(
  supabase: any,
  userId: string,
  provider: "google" | "outlook" | "ics",
  status: "success" | "failure",
  errorMessage?: string,
  metadata: Record<string, any> = {},
) {
  try {
    await supabase.from("calendar_connection_attempts").insert({
      user_id: userId,
      provider,
      status,
      error_message: errorMessage || null,
      metadata,
    });
  } catch (e) {
    console.error(`Failed to log ${provider} attempt:`, e);
  }
}

// ============================================================================
// TOUR MODE: group events of the same day into a single home→...→home tour trip
// ============================================================================

interface ResolvedEvent {
  event: CalendarEvent;
  eventDate: string; // YYYY-MM-DD (local)
  destinationAddress: string;
  startTs: number; // for sorting
}

async function resolveEventDestination(
  userId: string,
  event: CalendarEvent,
  supabase: any,
): Promise<string | null> {
  if (event.location && event.location.trim()) return event.location.trim();
  const matched = await findFrequentDestination(userId, event.summary || "", supabase);
  return matched || null;
}

async function processEventsAsTour(
  userId: string,
  events: CalendarEvent[],
  vehicle: VehicleInfo | null,
  userHomeLocation: { address: string; name: string } | null,
  supabase: any,
  source: string,
  ikRateOverride: IKRateOverride = "auto",
): Promise<{ toursCreated: number; fallbackEvents: CalendarEvent[] }> {
  if (!userHomeLocation?.address) {
    console.log(`⚠️ [tour-mode] No home address for user ${userId} - falling back to individual`);
    return { toursCreated: 0, fallbackEvents: events };
  }

  // Resolve destinations + group by local date
  const byDate = new Map<string, ResolvedEvent[]>();
  const unresolved: CalendarEvent[] = [];

  for (const ev of events) {
    const startIso = ev.start.dateTime || ev.start.date;
    if (!startIso) {
      unresolved.push(ev);
      continue;
    }
    const destination = await resolveEventDestination(userId, ev, supabase);
    if (!destination) {
      unresolved.push(ev);
      continue;
    }
    const d = new Date(startIso);
    const eventDate = d.toISOString().split("T")[0];
    const startTs = d.getTime();
    const arr = byDate.get(eventDate) || [];
    arr.push({ event: ev, eventDate, destinationAddress: destination, startTs });
    byDate.set(eventDate, arr);
  }

  const fallback: CalendarEvent[] = [...unresolved];
  let toursCreated = 0;

  for (const [eventDate, group] of byDate) {
    if (group.length < 2) {
      // Not a real tour — let individual flow handle it
      fallback.push(...group.map((g) => g.event));
      continue;
    }

    // Sort chronologically
    group.sort((a, b) => a.startTs - b.startTs);

    // Idempotency: a tour for this day already exists?
    const tourEventId = `tour:${eventDate}:${source}`;
    const { data: existingTour } = await supabase
      .from("trips")
      .select("id, deleted_at")
      .eq("user_id", userId)
      .eq("calendar_event_id", tourEventId)
      .limit(1);
    if (existingTour && existingTour.length > 0) {
      if (existingTour[0].deleted_at) {
        console.log(`⏭️ [tour-mode] Tour for ${eventDate} previously archived — skipping`);
      } else {
        console.log(`⏭️ [tour-mode] Tour for ${eventDate} already exists`);
      }
      continue;
    }

    // Also skip if any of the individual events was already imported as a trip
    let alreadyImportedIndividually = false;
    for (const g of group) {
      const { exists } = await tripExistsForEvent(userId, g.event.id, supabase);
      if (exists) {
        alreadyImportedIndividually = true;
        break;
      }
    }
    if (alreadyImportedIndividually) {
      console.log(
        `⏭️ [tour-mode] Some events on ${eventDate} already imported individually — skipping tour`,
      );
      continue;
    }

    // Compute segments: home → stop1 → stop2 → ... → home
    const stops = group.map((g) => g.destinationAddress);
    const legs = [userHomeLocation.address, ...stops, userHomeLocation.address];
    let totalDistance = 0;
    let allLegsOk = true;
    for (let i = 0; i < legs.length - 1; i++) {
      const d = await calculateDrivingDistance(legs[i], legs[i + 1]);
      if (d === null || d <= 0) {
        allLegsOk = false;
        break;
      }
      totalDistance += d;
    }
    if (!allLegsOk || totalDistance <= 0) {
      console.log(
        `⚠️ [tour-mode] Distance calc failed on ${eventDate} — falling back to individual`,
      );
      fallback.push(...group.map((g) => g.event));
      continue;
    }
    totalDistance = Math.round(totalDistance * 10) / 10;

    // IK
    let ikAmount = 0;
    if (vehicle) {
      const annualKm = await getVehicleAnnualKm(userId, vehicle.id, supabase);
      const ikBefore = calculateTotalAnnualIK(annualKm, vehicle.fiscal_power, ikRateOverride);
      const ikAfter = calculateTotalAnnualIK(
        annualKm + totalDistance,
        vehicle.fiscal_power,
        ikRateOverride,
      );
      ikAmount = ikAfter - ikBefore;
      if (vehicle.is_electric) ikAmount *= 1.2;
      ikAmount = Math.round(ikAmount * 100) / 100;
    }

    // Build tour_stops JSON (matching existing Tour Mode shape)
    const tourStops = group.map((g) => ({
      id: crypto.randomUUID(),
      address: g.destinationAddress,
      timestamp: new Date(g.startTs).toISOString(),
      purpose: g.event.summary || null,
      calendar_event_id: g.event.id,
    }));

    const purposeLine = `Tournée · ${group.length} rendez-vous : ${group
      .map((g) => g.event.summary || "RDV")
      .join(" → ")}`.slice(0, 500);

    const { error: insErr } = await supabase.from("trips").insert({
      user_id: userId,
      vehicle_id: vehicle?.id || null,
      start_location: userHomeLocation.address,
      end_location: userHomeLocation.address,
      distance: totalDistance,
      round_trip: false, // distance already includes return leg
      purpose: purposeLine,
      date: eventDate,
      ik_amount: ikAmount,
      source,
      calendar_event_id: tourEventId,
      tour_stops: tourStops,
      status: "validated",
    });

    if (insErr) {
      console.error(`❌ [tour-mode] Insert failed for ${eventDate}:`, insErr);
      fallback.push(...group.map((g) => g.event));
      continue;
    }

    console.log(
      `✅ [tour-mode] Created tour on ${eventDate}: ${group.length} stops, ${totalDistance} km, ${ikAmount}€`,
    );
    toursCreated++;
  }

  return { toursCreated, fallbackEvents: fallback };
}

async function getUserCalendarImportMode(
  userId: string,
  supabase: any,
): Promise<"individual" | "tour"> {
  const { data } = await supabase
    .from("user_preferences")
    .select("calendar_import_mode")
    .eq("user_id", userId)
    .maybeSingle();
  const mode = (data as any)?.calendar_import_mode;
  return mode === "tour" ? "tour" : "individual";
}

async function getUserIkRateOverride(userId: string, supabase: any): Promise<IKRateOverride> {
  const { data } = await supabase
    .from("user_preferences")
    .select("ik_rate_override")
    .eq("user_id", userId)
    .maybeSingle();
  const v = (data as any)?.ik_rate_override;
  return v === "tier2" || v === "tier3" ? v : "auto";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: allow (a) service-role / CRON secret for scheduled global runs,
  // or (b) a valid user JWT — in which case the sync is FORCED to that user only.
  const serviceRoleKey = SUPABASE_SERVICE_ROLE_KEY!;
  const cronSecret = Deno.env.get("CRON_SECRET");
  const syncCronToken = Deno.env.get("SYNC_CRON_TOKEN");
  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const xCronSecret = req.headers.get("x-cron-secret");

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  const isServiceCaller =
    (bearer && bearer === serviceRoleKey) ||
    (cronSecret && xCronSecret === cronSecret) ||
    (syncCronToken && xCronSecret === syncCronToken);

  let callerUserId: string | null = null;
  if (!isServiceCaller && bearer) {
    const { data: userData, error: userErr } = await supabase.auth.getUser(bearer);
    if (!userErr && userData?.user) {
      callerUserId = userData.user.id;
    }
  }

  if (!isServiceCaller && !callerUserId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Parse request body to get monthsBack + optional targetUserId
  let monthsBack = 0;
  let trigger = "cron";
  let targetUserId: string | null = null;
  try {
    const body = await req.json();
    monthsBack = body.monthsBack || 0;
    trigger = body.trigger || "cron";
    targetUserId = body.userId || null;
  } catch {
    // No body or invalid JSON - use default
  }

  // If caller is a regular user (not service/cron), FORCE scope to their own user_id.
  // This prevents any user from triggering a global sync of all calendars.
  if (callerUserId) {
    targetUserId = callerUserId;
    trigger = trigger || "manual";
  }

  try {
    // The sync itself (token refresh, Google/Outlook/ICS fetches, Distance Matrix
    // calls, trip writes) is long and costly: for a user-triggered run it becomes
    // a backend job, and the tab only polls `background_jobs`.
    const runSync = async (job: JobHandle | null) => {
      console.log("Starting calendar sync...");
      console.log("Time:", new Date().toISOString());
      console.log("Trigger:", trigger);
      console.log("Months back:", monthsBack);
      console.log("Caller:", isServiceCaller ? "service/cron" : `user:${callerUserId}`);
      if (targetUserId) console.log("Target user:", targetUserId);
      if (job) await job.setPhase("Lecture des agendas connectés", 10);

    // Get all active Google Calendar connections (or one user)
    let googleQuery = supabase
      .from("calendar_connections")
      .select("id, user_id, access_token, refresh_token, token_expires_at")
      .eq("provider", "google")
      .eq("is_active", true);
    if (targetUserId) googleQuery = googleQuery.eq("user_id", targetUserId);
    const { data: connections, error: connectionsError } = await googleQuery;

    if (connectionsError) {
      console.error("Failed to fetch calendar connections:", connectionsError);
      throw connectionsError;
    }

    console.log(`Found ${connections?.length || 0} active Google Calendar connections`);

    let totalTripsCreated = 0;
    let usersProcessed = 0;
    let syncDateRange: { startDate: string; endDate: string } | null = null;

    for (const connection of connections || []) {
      try {
        console.log(`Processing user ${connection.user_id}...`);

        // Refresh token if needed
        const accessToken = await refreshGoogleToken(connection, supabase);
        if (!accessToken) {
          console.log(`Skipping user ${connection.user_id} - no valid token`);
          continue;
        }

        // Fetch calendar events (with monthsBack parameter)
        const { events, dateRange } = await fetchGoogleCalendarEvents(accessToken, monthsBack);
        console.log(`Found ${events.length} events for user ${connection.user_id}`);

        // Store date range for response
        if (!syncDateRange) {
          syncDateRange = dateRange;
        }

        // Get user's last used vehicle
        const vehicle = await getUserLastUsedVehicle(connection.user_id, supabase);

        // Get user's home location for distance calculation and trip start name
        const userHomeLocation = await getUserHomeLocation(connection.user_id, supabase);
        console.log(
          `User home location: ${userHomeLocation ? `${userHomeLocation.name} (${userHomeLocation.address})` : "not found"}`,
        );

        // Determine import mode + IK rate override for this user
        const importMode = await getUserCalendarImportMode(connection.user_id, supabase);
        const ikRateOverride = await getUserIkRateOverride(connection.user_id, supabase);
        console.log(
          `User ${connection.user_id}: calendar_import_mode=${importMode}, ik_rate_override=${ikRateOverride}`,
        );

        // Create trips from events
        let tripsCreated = 0;
        let toursCreated = 0;
        let tripsWithDistance = 0;
        let skippedNoLocation = 0;
        let skippedAlreadyExists = 0;
        let skippedOther = 0;

        // In tour mode, first try to group same-day events into tours.
        // Events that can't be grouped (single-event days, no address, no home) fall back to individual.
        let eventsToProcess = events;
        if (importMode === "tour") {
          const { toursCreated: nTours, fallbackEvents } = await processEventsAsTour(
            connection.user_id,
            events,
            vehicle,
            userHomeLocation,
            supabase,
            "google_calendar",
            ikRateOverride,
          );
          toursCreated = nTours;
          tripsCreated += nTours;
          eventsToProcess = fallbackEvents;
        }

        for (const event of eventsToProcess) {
          const result = await createTripFromEvent(
            connection.user_id,
            event,
            vehicle,
            userHomeLocation,
            supabase,
            "google_calendar",
            ikRateOverride,
          );
          if (result.created) {
            tripsCreated++;
            if (result.distanceCalculated) {
              tripsWithDistance++;
            }
          } else if (result.reason === "no_location") {
            skippedNoLocation++;
          } else if (result.reason === "already_exists") {
            skippedAlreadyExists++;
          } else {
            skippedOther++;
          }
        }

        totalTripsCreated += tripsCreated;
        usersProcessed++;
        console.log(
          `User ${connection.user_id}: created=${tripsCreated} (tours=${toursCreated}, with_distance=${tripsWithDistance}), skipped_no_location=${skippedNoLocation}, skipped_exists=${skippedAlreadyExists}, skipped_other=${skippedOther}`,
        );
      } catch (error) {
        console.error(`Error processing user ${connection.user_id}:`, error);
      }
    }

    // ============ ICS connections (any calendar: Outlook, iCloud, generic .ics) ============
    let icsQuery = supabase
      .from("calendar_connections")
      .select("id, user_id, ics_url")
      .eq("provider", "ics")
      .eq("is_active", true);
    if (targetUserId) icsQuery = icsQuery.eq("user_id", targetUserId);
    const { data: icsConnections, error: icsError } = await icsQuery;

    if (icsError) {
      console.error("Failed to fetch ICS connections:", icsError);
    } else {
      console.log(`Found ${icsConnections?.length || 0} active ICS connections`);
      for (const conn of icsConnections || []) {
        try {
          if (!conn.ics_url) {
            console.log(`Skipping ICS user ${conn.user_id} - no url`);
            continue;
          }
          console.log(`Processing ICS user ${conn.user_id}...`);
          const { events, dateRange } = await fetchICSEvents(conn.ics_url, monthsBack);
          if (!syncDateRange) syncDateRange = dateRange;
          console.log(`Found ${events.length} ICS events for user ${conn.user_id}`);

          const vehicle = await getUserLastUsedVehicle(conn.user_id, supabase);
          const userHomeLocation = await getUserHomeLocation(conn.user_id, supabase);
          const importMode = await getUserCalendarImportMode(conn.user_id, supabase);
          const ikRateOverride = await getUserIkRateOverride(conn.user_id, supabase);
          console.log(
            `ICS user ${conn.user_id}: calendar_import_mode=${importMode}, ik_rate_override=${ikRateOverride}`,
          );

          let tripsCreated = 0;
          let toursCreated = 0;
          let skippedNoLocation = 0;
          let skippedAlreadyExists = 0;
          let skippedOther = 0;

          let eventsToProcess = events;
          if (importMode === "tour") {
            const { toursCreated: nTours, fallbackEvents } = await processEventsAsTour(
              conn.user_id,
              events,
              vehicle,
              userHomeLocation,
              supabase,
              "outlook_calendar",
              ikRateOverride,
            );
            toursCreated = nTours;
            tripsCreated += nTours;
            eventsToProcess = fallbackEvents;
          }

          for (const event of eventsToProcess) {
            const result = await createTripFromEvent(
              conn.user_id,
              event,
              vehicle,
              userHomeLocation,
              supabase,
              "outlook_calendar",
              ikRateOverride,
            );
            if (result.created) tripsCreated++;
            else if (result.reason === "no_location") skippedNoLocation++;
            else if (result.reason === "already_exists") skippedAlreadyExists++;
            else skippedOther++;
          }
          totalTripsCreated += tripsCreated;
          usersProcessed++;
          // Note: sync runs are NOT logged in calendar_connection_attempts.
          // That table now tracks only user-initiated connection attempts.
          console.log(
            `ICS user ${conn.user_id}: created=${tripsCreated} (tours=${toursCreated}), skipped_no_location=${skippedNoLocation}, skipped_exists=${skippedAlreadyExists}, skipped_other=${skippedOther}`,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown ICS error";
          console.error(`Error processing ICS user ${conn.user_id}:`, error);
          // Sync failures not logged as user connection attempts.
        }
      }
    }

      const result = {
        success: true,
        usersProcessed,
        totalTripsCreated,
        dateRange: syncDateRange,
        timestamp: new Date().toISOString(),
      };

      console.log("Calendar sync completed:", result);
      if (job) await job.succeed(result);
      return result;
    };

    // Cron/service keeps the synchronous contract.
    if (!callerUserId) {
      const result = await runSync(null);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const job = await createJob(supabase, "sync-calendar-trips", callerUserId, {
      monthsBack,
      trigger,
    });
    runDetached(async () => {
      try {
        await runSync(job);
      } catch (e) {
        console.error("Calendar sync job failed:", e);
        if (job) await job.fail(e);
      }
    });
    return jobAcceptedResponse(job, corsHeaders);
  } catch (error) {
    console.error("Error in sync-calendar-trips:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
