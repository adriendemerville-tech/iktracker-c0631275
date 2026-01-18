import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Printer, Download, Share2, Check, Copy } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

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

  const handleDownload = async () => {
    if (state.status !== "ready") return;
    
    setIsDownloading(true);
    try {
      // Create a blob from the HTML content and download it
      const blob = new Blob([state.html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `releve-ik-${new Date().toISOString().split("T")[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Téléchargement démarré");
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{title}</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={window.location.href} />
      </Helmet>

      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
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

          {/* Boutons d'action à droite */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={state.status !== "ready"}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Imprimer</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={state.status !== "ready" || isDownloading}
              className="gap-2"
            >
              <Download className={`h-4 w-4 ${isDownloading ? "animate-bounce" : ""}`} />
              <span className="hidden sm:inline">Télécharger</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareLink}
              disabled={state.status !== "ready"}
              className="gap-2"
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
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
