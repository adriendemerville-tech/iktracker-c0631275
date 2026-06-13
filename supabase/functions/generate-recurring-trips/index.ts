// Daily cron: generate trips from active recurring_trips matching today's day-of-week
// 0 = Sunday ... 6 = Saturday (JS convention, matches PostgreSQL EXTRACT(DOW))

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mirror of IK_BAREME_2024
const IK_BAREME: Record<string, { upTo5000: number; from5001To20000: { rate: number; fixed: number }; over20000: number }> = {
  "3":  { upTo5000: 0.529, from5001To20000: { rate: 0.316, fixed: 1065 }, over20000: 0.370 },
  "4":  { upTo5000: 0.606, from5001To20000: { rate: 0.340, fixed: 1330 }, over20000: 0.407 },
  "5":  { upTo5000: 0.636, from5001To20000: { rate: 0.357, fixed: 1395 }, over20000: 0.427 },
  "6":  { upTo5000: 0.665, from5001To20000: { rate: 0.374, fixed: 1457 }, over20000: 0.447 },
  "7+": { upTo5000: 0.697, from5001To20000: { rate: 0.394, fixed: 1515 }, over20000: 0.470 },
};

function getBareme(cv: number) {
  if (cv <= 3) return IK_BAREME["3"];
  if (cv === 4) return IK_BAREME["4"];
  if (cv === 5) return IK_BAREME["5"];
  if (cv === 6) return IK_BAREME["6"];
  return IK_BAREME["7+"];
}

function totalAnnualIK(km: number, cv: number): number {
  const b = getBareme(cv);
  if (km <= 5000) return km * b.upTo5000;
  if (km <= 20000) return km * b.from5001To20000.rate + b.from5001To20000.fixed;
  return km * b.over20000;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const dow = today.getUTCDay(); // 0..6

    const { data: recurring, error } = await supabase
      .from("recurring_trips")
      .select("*")
      .eq("is_active", true);

    if (error) throw error;

    let created = 0;
    let skipped = 0;

    for (const r of recurring ?? []) {
      const days: number[] = r.days_of_week ?? [];
      if (!days.includes(dow)) { skipped++; continue; }
      if (r.last_generated_date === todayStr) { skipped++; continue; }

      // Sum annual km for vehicle this fiscal year (simple: from Jan 1)
      const yearStart = `${today.getUTCFullYear()}-01-01`;
      let totalKm = 0;
      let vehicle: any = null;
      if (r.vehicle_id) {
        const { data: v } = await supabase
          .from("vehicles")
          .select("fiscal_power, is_electric")
          .eq("id", r.vehicle_id)
          .maybeSingle();
        vehicle = v;
        const { data: existing } = await supabase
          .from("trips")
          .select("distance")
          .eq("user_id", r.user_id)
          .eq("vehicle_id", r.vehicle_id)
          .is("deleted_at", null)
          .gte("date", yearStart);
        totalKm = (existing ?? []).reduce((s: number, t: any) => s + (t.distance ?? 0), 0);
      }

      const cv = vehicle?.fiscal_power ?? 5;
      const newTotal = totalKm + (r.distance ?? 0);
      let ik = totalAnnualIK(newTotal, cv) - totalAnnualIK(totalKm, cv);
      if (vehicle?.is_electric) ik *= 1.2;

      const startName = (r.start_location?.name || r.start_location?.address || "Départ") as string;
      const endName = (r.end_location?.name || r.end_location?.address || "Arrivée") as string;

      const { error: insErr } = await supabase.from("trips").insert({
        user_id: r.user_id,
        vehicle_id: r.vehicle_id,
        date: todayStr,
        start_location: startName,
        end_location: endName,
        distance: r.distance,
        purpose: r.purpose,
        round_trip: r.round_trip,
        ik_amount: ik,
        source: "recurring",
        status: "validated",
      });

      if (insErr) {
        console.error("[recurring] insert failed", r.id, insErr.message);
        continue;
      }

      await supabase
        .from("recurring_trips")
        .update({ last_generated_date: todayStr })
        .eq("id", r.id);

      created++;
    }

    return new Response(JSON.stringify({ ok: true, created, skipped, date: todayStr }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[recurring] error", e);
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
