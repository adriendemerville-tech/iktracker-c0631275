import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy, TriangleAlert } from "lucide-react";
import type { OAuthDiagnostic } from "@/lib/oauth-diagnostics";

interface OAuthErrorDialogProps {
  diagnostic: OAuthDiagnostic | null;
  onClose: () => void;
}

const CopyValue = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard indisponible */
        }
      }}
      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      title="Copier"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};

/**
 * Affiche un diagnostic détaillé quand la connexion OAuth échoue :
 * explication lisible, étapes de correction, et valeurs techniques copiables
 * (code d'erreur, URI envoyée, URI de callback à autoriser).
 */
export const OAuthErrorDialog = ({ diagnostic, onClose }: OAuthErrorDialogProps) => {
  const [copiedAll, setCopiedAll] = useState(false);

  if (!diagnostic) return null;

  const copyFullReport = async () => {
    const lines = [
      `Diagnostic connexion ${diagnostic.provider}`,
      `${diagnostic.title}`,
      "",
      ...diagnostic.technical.map((t) => `${t.label}: ${t.value}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    } catch {
      /* clipboard indisponible */
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-destructive" />
            {diagnostic.title}
          </DialogTitle>
          <DialogDescription className="text-left">
            {diagnostic.explanation}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium mb-2">Comment corriger</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              {diagnostic.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="rounded-md border bg-muted/40 p-3">
            <p className="font-medium mb-2">Détails techniques</p>
            <dl className="space-y-2">
              {diagnostic.technical.map((t) => (
                <div key={t.label}>
                  <dt className="text-xs text-muted-foreground">{t.label}</dt>
                  <dd className="flex items-start gap-2 font-mono text-xs break-all">
                    <span className="flex-1">{t.value}</span>
                    <CopyValue value={t.value} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={copyFullReport}>
            {copiedAll ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            Copier le diagnostic
          </Button>
          <Button onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
