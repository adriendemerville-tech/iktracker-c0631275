import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "@/lib/helmet-compat";
import { useNavigate } from "@/lib/router-compat";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Eye,
  FileText,
  LayoutList,
  Loader2,
  Monitor,
  Sparkles,
  Table as TableIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { supabase } from "@/integrations/supabase/client";
import { usePreferences } from "@/hooks/usePreferences";
import { buildCsv, downloadCsv } from "@/lib/autopilot-export";

interface ArchiveRow {
  id: string;
  kind: "monthly" | "annual";
  period_label: string;
  period_start: string;
  period_end: string;
  trip_count: number;
  total_km: number;
  total_ik: number;
  created_at: string;
}

const fmt = (n: number, d = 0) =>
  Number(n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

export default function Archive() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { preferences } = usePreferences();

  const [rows, setRows] = useState<ArchiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLabel, setPreviewLabel] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [view, setView] = useState<"list" | "table">("list");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadArchives = async () => {
    const { data, error } = await supabase
      .from("report_archives")
      .select(
        "id, kind, period_label, period_start, period_end, trip_count, total_km, total_ik, created_at",
      )
      .order("period_start", { ascending: false });
    if (!mountedRef.current) return;
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setRows((data ?? []) as ArchiveRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadArchives();
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, ArchiveRow[]>();
    rows.forEach((r) => {
      const y = r.period_start.slice(0, 4);
      map.set(y, [...(map.get(y) ?? []), r]);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  const exportCsv = () => {
    if (rows.length === 0) return;
    const csv = buildCsv(
      ["type", "periode", "debut", "fin", "nb_trajets", "total_km", "total_ik_eur", "archive_le"],
      rows.map((r) => [
        r.kind === "annual" ? "Exercice" : "Mensuel",
        r.period_label,
        r.period_start,
        r.period_end,
        r.trip_count,
        Number(r.total_km ?? 0).toFixed(1),
        Number(r.total_ik ?? 0).toFixed(2),
        r.created_at,
      ]),
    );
    downloadCsv(`releves-ik-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast({ title: "Export CSV généré", description: `${rows.length} relevés exportés.` });
  };

  const openReport = async (row: ArchiveRow, download = false) => {
    setBusyId(row.id);
    const { data, error } = await supabase.functions.invoke("report-archive", {
      body: { action: "signed_url", id: row.id },
    });
    if (!mountedRef.current) return;
    setBusyId(null);
    if (error || !data?.url) {
      toast({
        title: "Relevé indisponible",
        description: error?.message ?? "Lien impossible à générer",
        variant: "destructive",
      });
      return;
    }
    if (download) {
      window.open(data.url, "_blank", "noopener");
    } else {
      setPreviewLabel(row.period_label);
      setPreviewUrl(data.url);
    }
  };

  // Dernier exercice clos, selon la date de début d'exercice de l'utilisateur
  const lastClosedFiscalYear = useMemo(() => {
    const month = preferences?.fiscalYearStartMonth ?? 1;
    const day = preferences?.fiscalYearStartDay ?? 1;
    const now = new Date();
    let startYear = now.getFullYear();
    const thisYearStart = new Date(startYear, month - 1, day);
    if (now < thisYearStart) startYear -= 1;
    // exercice courant : startYear -> startYear+1 ; dernier clos : startYear-1 -> startYear
    const start = new Date(startYear - 1, month - 1, day);
    const end = new Date(startYear, month - 1, day);
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const label =
      month === 1 && day === 1
        ? `Exercice ${start.getFullYear()}`
        : `Exercice ${start.getFullYear()}-${end.getFullYear()}`;
    return { periodStart: iso(start), periodEnd: iso(end), label };
  }, [preferences?.fiscalYearStartMonth, preferences?.fiscalYearStartDay]);

  const alreadyGenerated = rows.some(
    (r) => r.kind === "annual" && r.period_start === lastClosedFiscalYear.periodStart,
  );

  const generateAnnual = async () => {
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("report-archive", {
      body: {
        action: "generate_annual",
        period_start: lastClosedFiscalYear.periodStart,
        period_end: lastClosedFiscalYear.periodEnd,
        label: lastClosedFiscalYear.label,
      },
    });
    if (!mountedRef.current) return;
    setGenerating(false);
    if (error || data?.error) {
      toast({
        title: "Génération impossible",
        description: data?.error ?? error?.message ?? "Erreur inconnue",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Relevé annuel archivé",
      description: `${lastClosedFiscalYear.label} — ${data.trip_count} trajets`,
    });
    loadArchives();
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="p-8 max-w-md text-center">
          <Monitor className="w-14 h-14 mx-auto mb-6 text-primary" />
          <h1 className="text-xl font-semibold text-foreground mb-3">Version ordinateur requise</h1>
          <p className="text-muted-foreground">
            L'archive des relevés PDF est consultable depuis un ordinateur.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => navigate("/app")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'application
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet></Helmet>

      <DesktopSidebar />

      <main className="md:pl-24 px-6 py-10 max-w-5xl mx-auto">
        <header className="mb-8">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => navigate("/app")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Archive des relevés</h1>
          <p className="text-muted-foreground mt-1">
            Tous vos relevés mensuels envoyés automatiquement le 15, conservés en PDF, plus vos
            relevés d'exercice.
          </p>
        </header>

        <Card className="p-5 mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">
              Relevé d'exercice — {lastClosedFiscalYear.label}
            </p>
            <p className="text-sm text-muted-foreground">
              {alreadyGenerated
                ? "Déjà archivé, disponible dans la liste ci-dessous."
                : `Période du ${new Date(lastClosedFiscalYear.periodStart).toLocaleDateString("fr-FR")} au ${new Date(lastClosedFiscalYear.periodEnd).toLocaleDateString("fr-FR")}.`}
            </p>
          </div>
          <Button onClick={generateAnnual} disabled={generating || alreadyGenerated}>
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {alreadyGenerated ? "Déjà généré" : "Générer le relevé annuel"}
          </Button>
        </Card>

        {!loading && rows.length > 0 && (
          <div className="flex items-center justify-between gap-3 mb-4">
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v) => v && setView(v as "list" | "table")}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="list" aria-label="Vue liste">
                <LayoutList className="w-4 h-4 mr-2" /> Liste
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Vue tableau">
                <TableIcon className="w-4 h-4 mr-2" /> Tableau
              </ToggleGroupItem>
            </ToggleGroup>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="w-4 h-4 mr-2" />
              Exporter en CSV
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement des relevés…
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-10 text-center">
            <FileText className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
            <p className="font-medium text-foreground">Aucun relevé archivé pour l'instant</p>
            <p className="text-sm text-muted-foreground mt-1">
              Votre premier relevé mensuel sera archivé ici automatiquement lors du prochain envoi
              du 15.
            </p>
          </Card>
        ) : view === "table" ? (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Période</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Du</TableHead>
                  <TableHead>Au</TableHead>
                  <TableHead className="text-right">Trajets</TableHead>
                  <TableHead className="text-right">Km</TableHead>
                  <TableHead className="text-right">IK (€)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.period_label}</TableCell>
                    <TableCell>
                      <Badge variant={row.kind === "annual" ? "default" : "secondary"}>
                        {row.kind === "annual" ? "Exercice" : "Mensuel"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(row.period_start).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(row.period_end).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(row.trip_count)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(row.total_km, 1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(row.total_ik, 2)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openReport(row)}
                        disabled={busyId === row.id}
                        aria-label="Aperçu du PDF"
                      >
                        {busyId === row.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openReport(row, true)}
                        aria-label="Télécharger le PDF"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-medium">
                  <TableCell colSpan={4}>Total ({rows.length} relevés)</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(rows.reduce((s, r) => s + (r.trip_count ?? 0), 0))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(
                      rows.reduce((s, r) => s + (r.total_km ?? 0), 0),
                      1,
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(
                      rows.reduce((s, r) => s + (r.total_ik ?? 0), 0),
                      2,
                    )}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        ) : (
          <div className="space-y-8">
            {groups.map(([year, items]) => (
              <section key={year}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  {year}
                </h2>
                <div className="space-y-2">
                  {items.map((row) => (
                    <Card
                      key={row.id}
                      className="p-4 flex items-center gap-4 hover:border-primary/40 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {row.kind === "annual" ? (
                          <CalendarDays className="w-5 h-5 text-primary" />
                        ) : (
                          <FileText className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">{row.period_label}</p>
                          <Badge variant={row.kind === "annual" ? "default" : "secondary"}>
                            {row.kind === "annual" ? "Exercice" : "Mensuel"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {fmt(row.trip_count)} trajets · {fmt(row.total_km, 1)} km ·{" "}
                          {fmt(row.total_ik, 2)} €
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReport(row)}
                        disabled={busyId === row.id}
                      >
                        {busyId === row.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                        <span className="ml-2">Aperçu</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openReport(row, true)}
                        aria-label="Télécharger le PDF"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 pt-5 pb-3 flex-shrink-0">
            <DialogTitle>{previewLabel}</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <iframe
              src={previewUrl}
              title={`Relevé ${previewLabel}`}
              className="w-full flex-1 min-h-0 border-0"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
