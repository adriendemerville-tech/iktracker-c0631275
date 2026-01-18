import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Printer, Download, Share2, Check } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { htmlToPdfBlob } from "@/lib/pdf-utils";

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; html: string };

export default function TemporaryReleve() {
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

      const { data, error } = await supabase.functions.invoke("view-report", {
        body: { id },
        headers: {
          Accept: "text/html",
        },
      });

      if (cancelled) return;

      if (error) {
        setState({ status: "error", message: "Impossible de charger le relevé." });
        return;
      }

      // view-report renvoie du texte (HTML) ; on l'affiche dans un iframe via srcDoc
      const html = typeof data === "string" ? data : String(data ?? "");
      if (!html.trim().startsWith("<!DOCTYPE") && !html.includes("<html")) {
        setState({ status: "error", message: "Contenu du relevé invalide." });
        return;
      }

      setState({ status: "ready", html });
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

  // Parse HTML to extract trip data for CSV export
  const extractTripsFromHtml = (html: string): { date: string; depart: string; arrivee: string; km: string; ik: string }[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('table tbody tr');
    const trips: { date: string; depart: string; arrivee: string; km: string; ik: string }[] = [];
    
    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 5) {
        trips.push({
          date: cells[0]?.textContent?.trim() || '',
          depart: cells[1]?.textContent?.trim() || '',
          arrivee: cells[2]?.textContent?.trim() || '',
          km: cells[3]?.textContent?.trim() || '',
          ik: cells[4]?.textContent?.trim() || '',
        });
      }
    });
    
    return trips;
  };

  const generateCsvBlob = (trips: { date: string; depart: string; arrivee: string; km: string; ik: string }[]): Blob => {
    const headers = ['Date', 'Départ', 'Arrivée', 'Distance (km)', 'Indemnité (€)'];
    const csvContent = [
      headers.join(';'),
      ...trips.map(trip => 
        [trip.date, `"${trip.depart}"`, `"${trip.arrivee}"`, trip.km, trip.ik].join(';')
      )
    ].join('\n');
    
    return new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  };

  const handleDownload = async () => {
    if (state.status !== "ready") return;
    
    setIsDownloading(true);
    try {
      const dateStr = new Date().toISOString().split("T")[0];
      
      // Generate PDF
      toast.info("Génération du PDF en cours...");
      const pdfBlob = await htmlToPdfBlob(state.html);
      
      // Generate CSV
      const trips = extractTripsFromHtml(state.html);
      const csvBlob = generateCsvBlob(trips);
      
      // Download PDF
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const pdfLink = document.createElement("a");
      pdfLink.href = pdfUrl;
      pdfLink.download = `releve-ik-${dateStr}.pdf`;
      document.body.appendChild(pdfLink);
      pdfLink.click();
      document.body.removeChild(pdfLink);
      URL.revokeObjectURL(pdfUrl);
      
      // Small delay before CSV download
      await new Promise(r => setTimeout(r, 300));
      
      // Download CSV
      const csvUrl = URL.createObjectURL(csvBlob);
      const csvLink = document.createElement("a");
      csvLink.href = csvUrl;
      csvLink.download = `releve-ik-${dateStr}.csv`;
      document.body.appendChild(csvLink);
      csvLink.click();
      document.body.removeChild(csvLink);
      URL.revokeObjectURL(csvUrl);
      
      toast.success("PDF et CSV téléchargés");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Erreur lors du téléchargement");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareLink = async () => {
    const shareUrl = window.location.href;
    
    try {
      // Try native share API first (mobile)
      if (navigator.share) {
        await navigator.share({
          title: "Relevé IK",
          text: "Consultez mon relevé de frais kilométriques",
          url: shareUrl,
        });
        return;
      }
      
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

  // Premium Apple-style button styling - refined dark gray with white text
  const appleButtonClass = "gap-2 bg-[#1d1d1f]/95 border-[#424245]/60 text-white hover:bg-[#2d2d30] active:bg-[#3a3a3c] backdrop-blur-xl transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.3)] font-medium rounded-lg";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{title}</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={window.location.href} />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
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
                  <span className="hidden sm:inline">Partager</span>
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
