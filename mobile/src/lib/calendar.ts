import * as Calendar from "expo-calendar";

export interface DayEvent {
  id: string;
  title: string;
  location: string | null;
  startDate: string;
  calendarId: string;
}

export async function requestCalendarAccess(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === "granted";
}

/**
 * Récupère les rendez-vous du jour. Règle métier web : les RDV d'un même
 * agenda et d'un même jour sont regroupés en une seule tournée.
 */
export async function fetchDayEvents(date = new Date()): Promise<Record<string, DayEvent[]>> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const events = await Calendar.getEventsAsync(
    calendars.map((c) => c.id),
    start,
    end,
  );

  const grouped: Record<string, DayEvent[]> = {};
  for (const e of events) {
    const item: DayEvent = {
      id: e.id,
      title: e.title ?? "Rendez-vous",
      location: e.location ?? null,
      startDate: new Date(e.startDate as string).toISOString(),
      calendarId: e.calendarId,
    };
    (grouped[e.calendarId] ??= []).push(item);
  }
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }
  return grouped;
}
