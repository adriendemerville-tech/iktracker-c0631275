import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Submission = {
  provider: string;
  status: string;
  http_status: number | null;
  response: string | null;
  submitted_at: string;
};

/**
 * Bandeau de santé de l'indexation : rend visibles les pannes silencieuses
 * (config Google Indexing API absente/invalide, lots IndexNow en attente de rejeu).
 */
export function IndexingHealthBanner() {
  const { data } = useQuery({
    queryKey: ["indexing-health"],
    queryFn: async (): Promise<Submission[]> => {
      const since = new Date(Date.now() - 3 * 24 * 3600_000).toISOString();
      const { data, error } = await supabase
        .from("indexing_submissions")
        .select("provider, status, http_status, response, submitted_at")
        .gte("submitted_at", since)
        .in("status", ["error", "retry"])
        .order("submitted_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Submission[];
    },
    staleTime: 60_000,
  });

  const rows = data ?? [];
  const googleError = rows.find((r) => r.provider === "google" && r.status === "error");
  const retries = rows.filter((r) => r.status === "retry");

  if (!googleError && retries.length === 0) return null;

  return (
    <div className="space-y-3">
      {googleError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Google Indexing API en panne</AlertTitle>
          <AlertDescription>
            Dernier échec le{" "}
            {new Date(googleError.submitted_at).toLocaleString("fr-FR")} —{" "}
            {googleError.response ?? `HTTP ${googleError.http_status ?? "?"}`}. Les nouvelles pages
            ne sont plus soumises à Google tant que le compte de service n'est pas corrigé.
          </AlertDescription>
        </Alert>
      )}
      {retries.length > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>{retries.length} lot(s) IndexNow en attente de rejeu</AlertTitle>
          <AlertDescription>
            Ces lots ont été limités (429) ou ont échoué temporairement ; ils seront rejoués
            automatiquement au prochain run quotidien (06:05 UTC).
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
