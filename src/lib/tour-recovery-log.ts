import { supabase } from "@/integrations/supabase/client";

export type TourRecoveryEventType =
  | "modal_shown"
  | "resume_clicked"
  | "resume_success"
  | "resume_error"
  | "finalize_clicked"
  | "transparent_resume_attempt"
  | "transparent_resume_success"
  | "transparent_resume_error"
  | "auto_finalize_attempt"
  | "auto_finalize_success"
  | "auto_finalize_error"
  | "toast_shown"
  | "session_end"
  | "check_error"
  | "manual_stop_added"
  | "manual_stop_error";

interface LogPayload {
  eventType: TourRecoveryEventType;
  sessionId?: string | null;
  tripId?: string | null;
  context?: string;
  inactivitySeconds?: number;
  isMobile?: boolean;
  stopsCount?: number;
  distanceKm?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget logger for tour recovery events.
 * Never throws — failures are silent to avoid disrupting the user flow.
 */
export async function logTourRecovery(payload: LogPayload): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("tour_recovery_events" as any).insert({
      user_id: user.id,
      session_id: payload.sessionId ?? null,
      trip_id: payload.tripId ?? null,
      event_type: payload.eventType,
      context: payload.context ?? null,
      inactivity_seconds: payload.inactivitySeconds ?? null,
      is_mobile: payload.isMobile ?? null,
      stops_count: payload.stopsCount ?? null,
      distance_km: payload.distanceKm ?? null,
      error_message: payload.errorMessage ?? null,
      metadata: payload.metadata ?? {},
    });

    // Increment aggregated counters on tour_sessions when relevant
    if (payload.sessionId) {
      const incrementField = mapEventToCounter(payload.eventType);
      if (incrementField) {
        await incrementSessionCounter(payload.sessionId, incrementField, payload.errorMessage);
      }
    }
  } catch (e) {
    console.warn("[tour-recovery-log] silent failure:", e);
  }
}

function mapEventToCounter(
  type: TourRecoveryEventType,
): "recovery_attempts" | "recovery_success" | "notifications_count" | null {
  switch (type) {
    case "modal_shown":
    case "transparent_resume_attempt":
    case "auto_finalize_attempt":
    case "resume_clicked":
      return "recovery_attempts";
    case "resume_success":
    case "transparent_resume_success":
    case "auto_finalize_success":
      return "recovery_success";
    case "toast_shown":
      return "notifications_count";
    default:
      return null;
  }
}

async function incrementSessionCounter(
  sessionId: string,
  field: "recovery_attempts" | "recovery_success" | "notifications_count",
  errorMessage?: string,
) {
  try {
    // Read current value, increment, write back (no atomic RPC available)
    const { data } = await supabase
      .from("tour_sessions")
      .select(`${field}, last_recovery_at, last_error` as any)
      .eq("id", sessionId)
      .maybeSingle();

    const current = (data as any)?.[field] ?? 0;
    const updatePayload: Record<string, any> = {
      [field]: current + 1,
      last_recovery_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (errorMessage) updatePayload.last_error = errorMessage;

    await supabase
      .from("tour_sessions")
      .update(updatePayload as any)
      .eq("id", sessionId);
  } catch {
    // silent
  }
}
