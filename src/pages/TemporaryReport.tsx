import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "@/lib/router-compat";
import { Helmet } from '@/lib/helmet-compat';
import { Printer, Download, Share2, Check, Send, FileSpreadsheet } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";


type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; html: string };

export default function TemporaryReport() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<ViewState>({ status: "loading" });
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const title = useMemo(() => "Aperçu du relevé IK", []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) {
        setState({ status: "error", message: "Lien invalide." });
        return;
      }

      setState({ status: "loading" });

      try {
        // Use direct fetch with GET for faster loading (no SDK overhead, cacheable)
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(
          `${supabaseUrl}/functions/v1/view-report?id=${encodeURIComponent(id)}&raw=1`,
          {
            method: "GET",
            headers: {
              "Accept": "text/html",
            },
          }
        );

        if (cancelled) return;

        if (!response.ok) {
          setState({ status: "error", message: "Impossible de charger le relevé." });
          return;
        }

        const html = await response.text();
        
        if (!html.trim().startsWith("<!DOCTYPE") && !html.includes("<html")) {
          setState({ status: "error", message: "Contenu du relevé invalide." });
          return;
        }

        setState({ status: "ready", html });
      } catch (error) {
        if (cancelled) return;
        console.error("Error loading report:", error);
        setState({ status: "error", message: "Impossible de charger le relevé." });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handlePrint = () => {
    // Access the iframe and trigger print
    const iframe = document.querySelector('iframe[title="Relevé IK"]') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  const handleDownload = async () => {
    if (state.status !== "ready") return;

    setIsDownloading(true);
    const dismissId = toast.loading("Génération du PDF en cours…");

    try {
      // Build a clean DOM from the report HTML
      const parser = new DOMParser();
      const parsed = parser.parseFromString(state.html, "text/html");
      parsed.querySelectorAll(".action-bar, script").forEach((el) => el.remove());

      // Container off-screen for html2pdf to render against
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-10000px";
      container.style.top = "0";
      container.style.width = "1100px";
      container.style.background = "#ffffff";
      container.innerHTML = parsed.body.innerHTML;
      // Inline the report styles so html2canvas captures them
      parsed.querySelectorAll("style").forEach((s) => container.appendChild(s.cloneNode(true)));
      document.body.appendChild(container);

      const html2pdf = (await import("html2pdf.js")).default;
      const dateStr = new Date().toISOString().split("T")[0];

      await html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename: `releve-ik-${dateStr}.pdf`,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        } as never)
        .from(container)
        .save();

      document.body.removeChild(container);
      toast.dismiss(dismissId);
      toast.success("PDF téléchargé");
    } catch (error) {
      console.error("Download error:", error);
      toast.dismiss(dismissId);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (state.status !== "ready") return;
    
    const iframe = document.querySelector('iframe[title="Relevé IK"]') as HTMLIFrameElement;
    if (!iframe?.contentDocument) return;
    
    const tripsTable = iframe.contentDocument.querySelector('#trips-table tbody');
    if (!tripsTable) {
      toast.error("Aucun trajet trouvé dans le rapport");
      return;
    }
    
    const headers = ['Date', 'Départ', 'Arrivée', 'Motif', 'Distance (km)', 'Cumul (km)', 'Montant IK (€)'];
    const rows: string[] = [];
    
    tripsTable.querySelectorAll('tr').forEach((row: Element) => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 7) {
        rows.push([
          cells[0].textContent?.trim() || '',
          cells[1].textContent?.trim() || '',
          cells[2].textContent?.trim() || '',
          cells[3].textContent?.trim() || '',
          cells[4].textContent?.trim() || '',
          cells[5].textContent?.trim() || '',
          (cells[6].textContent?.trim() || '').replace(' €', '')
        ].join(';'));
      }
    });
    
    const csv = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = URL.createObjectURL(blob);
    link.download = `releve-ik-${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("CSV téléchargé");
  };

  const handleShareLink = async () => {
    // Use clean /temporaryreport/ URL (without www)
    const shareUrl = `https://iktracker.fr/temporaryreport/${id}`;
    
    try {
      // Fallback to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      toast.success("Lien copié dans le presse-papiers");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setIsCopied(true);
      toast.success("Lien copié");
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleSendEmail = () => {
    // Construct clean URL for email (without www)
    const shareUrl = `https://iktracker.fr/temporaryreport/${id}`;
    const currentMonth = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const subject = encodeURIComponent(`Relevé des indemnités kilométriques - ${currentMonth}`);
    
    const emailBody = `Bonjour,

Veuillez trouver ci-dessous le lien vers mon relevé des indemnités kilométriques pour la période en cours.

📎 Consultez le relevé en ligne (valide 7 jours) :

${shareUrl}

Ce lien vous permet de visualiser, télécharger ou imprimer le relevé complet.

Je reste à votre disposition pour toute question.

Cordialement

---
Document généré via IKtracker
https://iktracker.fr`;

    const body = encodeURIComponent(emailBody);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Premium Apple-style button styling - refined dark gray with white text
  const appleButtonClass = "gap-2 bg-[#1d1d1f]/95 border-[#424245]/60 text-white hover:bg-[#2d2d30] active:bg-[#3a3a3c] backdrop-blur-xl transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.3)] font-medium rounded-lg";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{title}</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={window.location.href} />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/pwa-icon-192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Helmet>

      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          {/* Logo à gauche - lien vers landing */}
          <Link 
            to="/" 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="Aller à la page d'accueil IKtracker"
          >
            <img 
              src="/logo-iktracker-250.webp" 
              alt="IKtracker" 
              className="h-8 w-auto"
            />
          </Link>

          {/* Boutons d'action à droite - style gris premium */}
          <div className="flex items-center gap-2">
            {/* Télécharger en premier */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={state.status !== "ready" || isDownloading}
              className={appleButtonClass}
            >
              <Download className={`h-4 w-4 ${isDownloading ? "animate-bounce" : ""}`} />
              <span className="hidden sm:inline">Télécharger</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCSV}
              disabled={state.status !== "ready"}
              className={appleButtonClass}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={state.status !== "ready"}
              className={appleButtonClass}
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Imprimer</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendEmail}
              disabled={state.status !== "ready"}
              className={appleButtonClass}
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Envoyer par mail</span>
            </Button>

            {/* Copier le lien en dernier */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareLink}
              disabled={state.status !== "ready"}
              className={appleButtonClass}
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4 text-green-400" />
                  <span className="hidden sm:inline">Copié !</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Copier le lien</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-4">
        <Card className="overflow-hidden">
          {state.status === "loading" && (
            <div className="p-6">
              <div className="h-4 w-56 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-3 w-80 animate-pulse rounded bg-muted" />
              <div className="mt-6 h-[70vh] w-full animate-pulse rounded bg-muted" />
            </div>
          )}

          {state.status === "error" && (
            <div className="p-6">
              <p className="text-sm text-muted-foreground">{state.message}</p>
            </div>
          )}

          {state.status === "ready" && (
            <iframe
              title="Relevé IK"
              className="h-[calc(100vh-120px)] w-full bg-background"
              srcDoc={state.html}
              // Sandbox light: prevents the embedded doc from navigating the top page
              sandbox="allow-forms allow-popups allow-same-origin allow-modals"
            />
          )}
        </Card>
      </main>
    </div>
  );
}
