import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface GoogleCalendarStatusProps {
  userId: string;
}

interface CalendarInfo {
  isConnected: boolean;
  isActive: boolean;
  lastSync: string | null;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD === 1) return "Hier";
  if (diffD < 7) return `Il y a ${diffD} jours`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function GoogleCalendarStatus({ userId }: GoogleCalendarStatusProps) {
  const [info, setInfo] = useState<CalendarInfo | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from("calendar_connections")
        .select("is_active, updated_at")
        .eq("user_id", userId)
        .eq("provider", "google")
        .maybeSingle();

      if (error) {
        console.warn("Failed to fetch Google Calendar status:", error);
        setInfo({ isConnected: false, isActive: false, lastSync: null });
        return;
      }

      if (!data) {
        setInfo({ isConnected: false, isActive: false, lastSync: null });
        return;
      }

      // Get the last calendar-synced trip as proxy for last sync time
      const { data: lastTrip } = await supabase
        .from("trips")
        .select("created_at")
        .eq("user_id", userId)
        .eq("source", "google_calendar")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setInfo({
        isConnected: true,
        isActive: data.is_active,
        lastSync: lastTrip?.created_at || data.updated_at,
      });
    };

    fetchStatus();
  }, [userId]);

  if (!info) return null;

  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center gap-3 py-3 px-4">
        {/* Google Calendar icon */}
        <svg viewBox="0 0 24 24" className="w-6 h-6 flex-shrink-0">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {info.isConnected && info.isActive ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            ) : info.isConnected ? (
              <XCircle className="w-3.5 h-3.5 text-destructive/70 flex-shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            )}
            <span className="text-sm font-medium truncate">
              {info.isConnected && info.isActive
                ? "Google Calendar connecté"
                : info.isConnected
                  ? "Google Calendar en pause"
                  : "Google Calendar non connecté"}
            </span>
          </div>

          {info.isConnected && info.lastSync && (
            <div className="flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Dernière sync : {formatRelativeTime(info.lastSync)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
