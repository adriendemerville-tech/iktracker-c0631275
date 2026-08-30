import { Suspense, type ReactNode } from "react";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isChunkLoadError } from "@/lib/lazy-retry";

interface LazyBoundaryProps {
  children: ReactNode;
  /** Affiché pendant le chargement du chunk. */
  fallback?: ReactNode;
  /** Libellé du bloc concerné, affiché dans le message d'erreur. */
  label?: string;
}

function ChunkFallback({
  error,
  resetErrorBoundary,
  label,
}: {
  error: unknown;
  resetErrorBoundary: () => void;
  label?: string;
}) {
  const isChunk = isChunkLoadError(error);

  return (
    <div
      role="alert"
      className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/30 p-6 text-center"
    >
      <AlertTriangle className="h-6 w-6 text-warning" />
      <p className="text-sm font-semibold">
        {isChunk ? "Ce module n'a pas pu être chargé" : "Erreur d'affichage"}
        {label ? ` — ${label}` : ""}
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">
        {isChunk
          ? "Une nouvelle version du site vient peut-être d'être publiée, ou votre connexion a été interrompue."
          : "Le contenu n'a pas pu s'afficher. Vous pouvez réessayer sans quitter la page."}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="sm" variant="outline" onClick={resetErrorBoundary}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Réessayer
        </Button>
        <Button size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Recharger la page
        </Button>
      </div>
    </div>
  );
}

/**
 * Suspense + garde-fou pour tout composant chargé dynamiquement :
 * si le chunk est introuvable (déploiement, réseau), on affiche un fallback
 * actionnable au lieu de laisser l'erreur remonter en 500 / écran blanc.
 */
export function LazyBoundary({ children, fallback = null, label }: LazyBoundaryProps) {
  return (
    <ReactErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <ChunkFallback error={error} resetErrorBoundary={resetErrorBoundary} label={label} />
      )}
    >
      <Suspense fallback={fallback}>{children}</Suspense>
    </ReactErrorBoundary>
  );
}
