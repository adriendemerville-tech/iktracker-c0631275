// report-archive
// Archive des relevés IK (bucket privé `report-archives` + index `report_archives`).
//
// POST { action: 'signed_url', id }                       -> URL signée (5 min) du PDF archivé
// POST { action: 'generate_annual', period_start, period_end, label? }
//                                                          -> génère + archive le relevé d'exercice
//
// Auth: JWT utilisateur obligatoire, tout est scopé sur auth.uid().

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  ARCHIVE_BUCKET,
  archiveReportPdf,
  buildReportBody,
  fetchTripsForPeriod,
  renderPdf,
  wrapForPdf,
  type ReportVehicle,
} from "../_shared/report-pdf.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Missing authorization" }, 401);

  const { data: userData, error: authErr } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  const action = body.action;

  try {
    if (action === "signed_url") {
      const id = body.id;
      if (!id) return json({ error: "id required" }, 400);

      const { data: row, error } = await admin
        .from("report_archives")
        .select("storage_path, period_label, kind")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!row) return json({ error: "Not found" }, 404);

      const { data: signed, error: sErr } = await admin.storage
        .from(ARCHIVE_BUCKET)
        .createSignedUrl(row.storage_path, 300);
      if (sErr || !signed) throw sErr ?? new Error("signed url failed");

      return json({ url: signed.signedUrl, label: row.period_label, kind: row.kind });
    }

    if (action === "generate_annual") {
      const periodStart = body.period_start;
      const periodEnd = body.period_end;
      if (!ISO_DATE.test(periodStart ?? "") || !ISO_DATE.test(periodEnd ?? "")) {
        return json({ error: "period_start / period_end (YYYY-MM-DD) required" }, 400);
      }
      if (periodEnd <= periodStart) return json({ error: "Invalid period range" }, 400);

      const label = body.label?.slice(0, 80) || `Exercice ${periodStart.slice(0, 4)}`;

      const [{ data: vehicles }, tripList] = await Promise.all([
        admin
          .from("vehicles")
          .select("id,name,make,model,year,license_plate,fiscal_power,is_electric")
          .eq("user_id", user.id),
        fetchTripsForPeriod(admin as never, user.id, periodStart, periodEnd),
      ]);

      if (tripList.length === 0) return json({ error: "Aucun trajet sur cet exercice" }, 400);

      const meta = (user.user_metadata ?? {}) as Record<string, string>;
      const userName =
        [meta.first_name, meta.last_name].filter(Boolean).join(" ") || user.email || "Utilisateur";

      const title = `Relevé kilométrique — ${label}`;
      const html = wrapForPdf(
        title,
        buildReportBody(title, userName, tripList, (vehicles ?? []) as ReportVehicle[]),
      );
      const pdf = await renderPdf(html);

      const result = await archiveReportPdf(admin as never, {
        userId: user.id,
        kind: "annual",
        periodLabel: label,
        periodStart,
        periodEnd,
        pdf,
        tripCount: tripList.length,
        totalKm: tripList.reduce((s, t) => s + (t.distance ?? 0), 0),
        totalIk: tripList.reduce((s, t) => s + (t.ik_amount ?? 0), 0),
      });
      if (!result) return json({ error: "Archivage impossible" }, 500);

      return json({ success: true, label, trip_count: tripList.length });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("report-archive error:", msg);
    return json({ error: msg }, 500);
  }
});
