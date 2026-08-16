import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, MousePointer, Percent, TrendingUp } from "lucide-react";

type Row = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };
type Totals = { clicks: number; impressions: number; ctr: number; position: number };

async function invoke(body: any) {
  const { data, error } = await supabase.functions.invoke("gsc-analytics", { body });
  if (error) throw error;
  return data;
}

export function SearchConsoleCard() {
  const [sites, setSites] = useState<{ siteUrl: string; permissionLevel?: string }[]>([]);
  const [siteUrl, setSiteUrl] = useState<string>("");
  const [days, setDays] = useState<number>(28);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [queries, setQueries] = useState<Row[]>([]);
  const [pages, setPages] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await invoke({ action: "sites" });
        const list = (res?.siteEntry ?? []).filter(
          (s: any) => s.permissionLevel !== "siteUnverifiedUser",
        );
        setSites(list);
        if (list.length && !siteUrl) setSiteUrl(list[0].siteUrl);
      } catch (e: any) {
        setError(e.message ?? "Erreur");
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!siteUrl) return;
    setLoading(true);
    setError(null);
    Promise.all([
      invoke({ action: "query", siteUrl, days, dimensions: [], rowLimit: 1 }),
      invoke({ action: "query", siteUrl, days, dimensions: ["query"], rowLimit: 10 }),
      invoke({ action: "query", siteUrl, days, dimensions: ["page"], rowLimit: 10 }),
    ])
      .then(([sum, q, p]) => {
        const t = sum?.rows?.[0];
        setTotals(
          t
            ? { clicks: t.clicks, impressions: t.impressions, ctr: t.ctr, position: t.position }
            : { clicks: 0, impressions: 0, ctr: 0, position: 0 },
        );
        setQueries(q?.rows ?? []);
        setPages(p?.rows ?? []);
      })
      .catch((e) => setError(e.message ?? "Erreur"))
      .finally(() => setLoading(false));
  }, [siteUrl, days]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Google Search Console
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {sites.length > 0 && (
              <Select value={siteUrl} onValueChange={setSiteUrl}>
                <SelectTrigger className="h-8 w-[220px]">
                  <SelectValue placeholder="Site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.siteUrl} value={s.siteUrl}>
                      {s.siteUrl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <ToggleGroup
              type="single"
              size="sm"
              value={String(days)}
              onValueChange={(v) => v && setDays(Number(v))}
            >
              <ToggleGroupItem value="7">7j</ToggleGroupItem>
              <ToggleGroupItem value="28">28j</ToggleGroupItem>
              <ToggleGroupItem value="90">90j</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : totals ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi
                icon={<MousePointer className="w-4 h-4" />}
                label="Clics"
                value={totals.clicks.toLocaleString("fr-FR")}
              />
              <Kpi
                icon={<Search className="w-4 h-4" />}
                label="Impressions"
                value={totals.impressions.toLocaleString("fr-FR")}
              />
              <Kpi
                icon={<Percent className="w-4 h-4" />}
                label="CTR"
                value={`${(totals.ctr * 100).toFixed(2)}%`}
              />
              <Kpi
                icon={<TrendingUp className="w-4 h-4" />}
                label="Position moy."
                value={totals.position.toFixed(1)}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <RowsTable title="Top requêtes" rows={queries} keyLabel="Requête" />
              <RowsTable title="Top pages" rows={pages} keyLabel="Page" truncate />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>
        )}
      </CardContent>
    </Card>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function RowsTable({
  title,
  rows,
  keyLabel,
  truncate,
}: {
  title: string;
  rows: Row[];
  keyLabel: string;
  truncate?: boolean;
}) {
  return (
    <div>
      <h4 className="text-sm font-medium mb-2">{title}</h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{keyLabel}</TableHead>
            <TableHead className="text-right">Clics</TableHead>
            <TableHead className="text-right">Impr.</TableHead>
            <TableHead className="text-right">CTR</TableHead>
            <TableHead className="text-right">Pos.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground text-sm">
                Aucune donnée
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className={truncate ? "max-w-[240px] truncate" : ""} title={r.keys?.[0]}>
                  {r.keys?.[0]}
                </TableCell>
                <TableCell className="text-right">{r.clicks}</TableCell>
                <TableCell className="text-right">{r.impressions}</TableCell>
                <TableCell className="text-right">{(r.ctr * 100).toFixed(1)}%</TableCell>
                <TableCell className="text-right">{r.position.toFixed(1)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
