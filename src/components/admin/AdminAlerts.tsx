import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Alert = { id: string; title: string; detail: string };

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google Calendar",
  outlook: "Outlook Calendar",
  microsoft: "Outlook Calendar",
  ics: "Agenda ICS",
};

const DISMISS_KEY = "ik_admin_dismissed_alerts";

/**
 * Système d'alertes admin : détecte les anomalies critiques (ex. un fournisseur
 * d'agenda dont toutes les connexions récentes échouent → secret expiré).
 */
export function AdminAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    try {
      setDismissed(JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]"));
    } catch { /* ignore */ }

    (async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await supabase
        .from("calendar_connection_attempts")
        .select("provider,status,error_message,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);
      if (!data) return;

      const byProvider = new Map<string, typeof data>();
      for (const row of data) {
        const list = byProvider.get(row.provider) ?? [];
        list.push(row);
        byProvider.set(row.provider, list);
      }

      const out: Alert[] = [];
      byProvider.forEach((rows, provider) => {
        // Série d'échecs consécutifs les plus récents
        let streak = 0;
        for (const r of rows) {
          if (r.status === "failure") streak++;
          else break;
        }
        if (streak >= 3) {
          const label = PROVIDER_LABEL[provider] ?? provider;
          const lastErr = rows[0]?.error_message?.slice(0, 140) ?? "erreur inconnue";
          const day = new Date(rows[0].created_at).toISOString().slice(0, 10);
          out.push({
            id: `cal-${provider}-${day}`,
            title: `${label} : ${streak} connexions échouées d'affilée`,
            detail: `Aucune réussite récente. Cause probable : clé secrète du fournisseur expirée ou révoquée. Dernière erreur : ${lastErr}`,
          });
        }
      });
      setAlerts(out);
    })();
  }, []);

  const visible = alerts.filter((a) => !dismissed.includes(a.id));
  if (!visible.length) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id].slice(-100);
    setDismissed(next);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
  };

  return (
    <div className="mb-4 space-y-2">
      {visible.map((a) => (
        <div
          key={a.id}
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="font-semibold text-destructive">{a.title}</p>
            <p className="text-muted-foreground">{a.detail}</p>
          </div>
          <button
            onClick={() => dismiss(a.id)}
            aria-label="Masquer l'alerte"
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
